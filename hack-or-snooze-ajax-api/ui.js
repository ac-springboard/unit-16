$(async function () {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList    = $("#all-articles-list");
	const $submitForm        = $("#submit-form");
	const $ownStories        = $("#my-articles");
	const $favoritedArticles = $("#favorited-articles");
	const $filteredArticles  = $("#filtered-articles");
	const $loginForm         = $("#login-form");
	const $createAccountForm = $("#create-account-form");
	const $navLogin          = $("#nav-login");
	const $navLogOut         = $("#nav-logout");

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	/**
	 * Event listener for logging in.
	 *  If successfully we will setup the user instance
	 */

	$loginForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $("#login-username").val();
		const password = $("#login-password").val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser        = userInstance;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Event listener for signing up.
	 *  If successfully we will setup a new user instance
	 */

	$createAccountForm.on("submit", async function (evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name     = $("#create-account-name").val();
		let username = $("#create-account-username").val();
		let password = $("#create-account-password").val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser   = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Log Out Functionality
	 */

	$navLogOut.on("click", function () {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
	 * Event Handler for Clicking Login
	 */

	$navLogin.on("click", function () {
		// Show the Login and Create Account Forms
		$allStoriesList.toggle();
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
	});

	/**
	 * Event handler for Navigation to Homepage
	 */

	$("body").on("click", "#nav-all", async function (e) {
		e.preventDefault();
		hideOrEmptyElements();
		await generateStories();
		$allStoriesList.show();
	});

	$('.toggle-favorite').on('click', '.fa-star', async function (e) {
		e.preventDefault();
		clog('e.target', e.target);
		const newClass = suitch(e.target.classList, "far", "fas");
		const method   = newClass === 'far' ? 'DELETE' : 'POST';
		const storyId  = e.target.parentElement.id;
		const response = await StoryList.toggleFavorite(method, storyId);
		currentUser.setFavorites(response.data.user.favorites);
	});

	$('#nav-favorites').on('click', async (e) => {
		e.preventDefault();
		hideOrEmptyElements();
		await generateFavorites();
		$favoritedArticles.show();
		clog($favoritedArticles);
	});

	$('#nav-submit').on('click', (e) => {
		e.preventDefault();
		$submitForm.toggle(500, 'linear');
	});

	$submitForm.on('submit', async function (e) {
		e.preventDefault();
		const storyObj = {};
		$('.add-story-input').each(function () {
			storyObj[this.id] = this.value;
		});
		const newStory = await StoryList.addStory(storyObj);
		console.log( newStory );
		// const stopHere = true;
	});

	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token    = localStorage.getItem("token");
		const username = localStorage.getItem("username");

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
		}
	}

	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */

	async function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger("reset");
		$createAccountForm.trigger("reset");

		// show the stories
		$allStoriesList.empty();
		await generateStories();
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	async function generateFavorites() {
		const storyListInstance = await StoryList.getFavorites(currentUser);
		const storyList         = storyListInstance;
		$favoritedArticles.empty();
		populateHistoryListHtml(storyList, $favoritedArticles);
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */
	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList               = storyListInstance;
		// const favStory = storyList.stories.filter( (s) => s.storyId === "ca68c0f9-9dd8-4651-aadb-5739df62146a");
		// const favStory = storyList.stories.filter( (s) => s.author === "Elie Schoppik");
		// clog( 'favStory', favStory );
		// Object.key
		// let favStory;
		clog('currentUser:', currentUser);
		if (currentUser) {
			currentUser.favorites.forEach(fav => {
				storyList.stories.some((story) => {
					// favStory = storyList.stories.filter( (s) => s.storyId === fav.storyId );
					if (story.storyId === fav.storyId) {
						story.favorite = true;
						clog(story);
						return;
					}
				});
			});
		}
		clog('storyList', storyList.stories);

		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		populateHistoryListHtml(storyList, $allStoriesList);
		// for (let story of storyList.stories) {
		// 	const result = generateStoryHTML(story);
		// 	$allStoriesList.append(result);
		// }
		clog("$allStoriesList", $allStoriesList);
	}

	function populateHistoryListHtml(storyList, $element) {
		let result;
		for (let story of storyList.stories) {
			result = generateStoryHTML(story);
			$element.append(result);
		}
	}

	/**
	 * A function to render HTML for an individual Story instance
	 */

	function generateStoryHTML(story) {
		let hostName = getHostName(story.url);
		let favClass = !currentUser ? "hidden" : story.favorite ? "fas" : "far";
		// 	const favClass = 'far';
		// render story markup
		const storyMarkup = $(`
      <li id="${story.storyId}">
        <small class="${favClass} fa-star icon icon-favorites"></small>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

		return storyMarkup;
	}

	/* hide all elements in elementsArr */

	function hideOrEmptyElements() {
		const toHide  = [
			$submitForm,
			$loginForm,
			$createAccountForm
		];
		const toEmpty = [
			$allStoriesList,
			$filteredArticles,
			$favoritedArticles,
			$ownStories
		];
		toHide.forEach($elem => $elem.hide());
		toEmpty.forEach($elem => $elem.empty());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf("://") > -1) {
			hostName = url.split("/")[2];
		} else {
			hostName = url.split("/")[0];
		}
		if (hostName.slice(0, 4) === "www.") {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem("token", currentUser.loginToken);
			localStorage.setItem("username", currentUser.username);
		}
	}
});
