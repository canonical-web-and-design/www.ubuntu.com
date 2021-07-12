var navDropdowns = [].slice.call(
  document.querySelectorAll(".p-navigation__dropdown-link")
);
var dropdownWindow = document.querySelector(".dropdown-window");
var dropdownWindowOverlay = document.querySelector(".dropdown-window-overlay");

navDropdowns.forEach(function (dropdown) {
  dropdown.addEventListener("click", function (event) {
    event.preventDefault();

    var clickedDropdown = this;

    dropdownWindow.classList.remove("slide-animation");
    dropdownWindowOverlay.classList.remove("fade-animation");

    navDropdowns.forEach(function (dropdown) {
      var dropdownContent = document.getElementById(dropdown.id + "-content");

      if (dropdown === clickedDropdown) {
        if (dropdown.classList.contains("is-selected")) {
          closeMenu(dropdown, dropdownContent);
        } else {
          dropdown.classList.add("is-selected");
          dropdownContent.classList.remove("u-hide");

          if (window.history.pushState) {
            window.history.pushState(null, null, "#" + dropdown.id);
          }
        }
      } else {
        dropdown.classList.remove("is-selected");
        dropdownContent.classList.add("u-hide");
      }
    });
  });
});

// Close the menu if browser back button is clicked
window.addEventListener("hashchange", function () {
  navDropdowns.forEach(function (dropdown) {
    const dropdownContent = document.getElementById(dropdown.id + "-content");

    if (dropdown.classList.contains("is-selected")) {
      closeMenu(dropdown, dropdownContent);
    }
  });
});

if (dropdownWindowOverlay) {
  dropdownWindowOverlay.addEventListener("click", function () {
    navDropdowns.forEach(function (dropdown) {
      var dropdownContent = document.getElementById(dropdown.id + "-content");

      if (dropdown.classList.contains("is-selected")) {
        closeMenu(dropdown, dropdownContent);
      }
    });
  });
}

function closeMenu(dropdown) {
  dropdown.classList.remove("is-selected");
  dropdownWindow.classList.add("slide-animation");
  dropdownWindowOverlay.classList.add("fade-animation");
  if (window.history.pushState) {
    window.history.pushState(null, null, window.location.href.split("#")[0]);
  }
}

if (window.location.hash) {
  var tabId = window.location.hash.split("#")[1];
  var tab = document.getElementById(tabId);

  if (tab) {
    setTimeout(function () {
      document.getElementById(tabId).click();
    }, 0);
  }
}

var origin = window.location.href;

addGANavEvents("#canonical-products", "www.ubuntu.com-nav-0-products");
addGANavEvents("#canonical-login", "www.ubuntu.com-nav-0-login");
addGANavEvents("#navigation", "www.ubuntu.com-nav-1");
addGANavEvents("#enterprise-content", "www.ubuntu.com-nav-1-enterprise");
addGANavEvents("#developer-content", "www.ubuntu.com-nav-1-developer");
addGANavEvents("#community-content", "www.ubuntu.com-nav-1-community");
addGANavEvents("#download-content", "www.ubuntu.com-nav-1-download");
addGANavEvents(".p-navigation--secondary", "www.ubuntu.com-nav-2");
addGANavEvents(".p-contextual-footer", "www.ubuntu.com-footer-contextual");
addGANavEvents(".p-footer__nav", "www.ubuntu.com-nav-footer-0");
addGANavEvents(".p-footer--secondary", "www.ubuntu.com-nav-footer-1");
addGANavEvents(".js-product-card", "www.ubuntu.com-product-card");

function addGANavEvents(target, category) {
  var t = document.querySelector(target);
  if (t) {
    [].slice.call(t.querySelectorAll("a")).forEach(function (a) {
      a.addEventListener("click", function () {
        dataLayer.push({
          event: "GAEvent",
          eventCategory: category,
          eventAction: "from:" + origin + " to:" + a.href,
          eventLabel: a.text,
          eventValue: undefined,
        });
      });
    });
  }
}

addGAContentEvents("#main-content");

function addGAContentEvents(target) {
  var t = document.querySelector(target);
  if (t) {
    [].slice.call(t.querySelectorAll("a")).forEach(function (a) {
      let category;
      if (a.classList.contains("p-button--positive")) {
        category = "www.ubuntu.com-content-cta-0";
      } else if (a.classList.contains("p-button")) {
        category = "www.ubuntu.com-content-cta-1";
      } else {
        category = "www.ubuntu.com-content-link";
      }
      if (!a.href.startsWith("#")) {
        a.addEventListener("click", function () {
          dataLayer.push({
            event: "GAEvent",
            eventCategory: category,
            eventAction: "from:" + origin + " to:" + a.href,
            eventLabel: a.text,
            eventValue: undefined,
          });
        });
      }
    });
  }
}

addGAImpressionEvents(".js-product-card", "product-card");

function addGAImpressionEvents(target, category) {
  var t = [].slice.call(document.querySelectorAll(target));
  if (t) {
    t.forEach(function (section) {
      if (!section.classList.contains("u-hide")) {
        var a = section.querySelector("a");
        dataLayer.push({
          event: "NonInteractiveGAEvent",
          eventCategory: "www.ubuntu.com-impression-" + category,
          eventAction: "from:" + origin + " to:" + a.href,
          eventLabel: a.text,
          eventValue: undefined,
        });
      }
    });
  }
}

addGADownloadImpressionEvents(".js-download-option", "download-option");

function addGADownloadImpressionEvents(target, category) {
  var t = [].slice.call(document.querySelectorAll(target));
  if (t) {
    t.forEach(function (section) {
      dataLayer.push({
        event: "NonInteractiveGAEvent",
        eventCategory: "www.ubuntu.com-impression-" + category,
        eventAction: "Display option",
        eventLabel: section.innerText,
        eventValue: undefined,
      });
    });
  }
}

addUTMToForms();

function addUTMToForms() {
  var params = new URLSearchParams(window.location.search);
  const utm_names = ["campaign", "source", "medium"];
  for (let i = 0; i < utm_names.length; i++) {
    var utm_fields = document.getElementsByName("utm_" + utm_names[i]);
    for (let j = 0; j < utm_fields.length; j++) {
      if (utm_fields[j]) {
        utm_fields[j].value = params.get("utm_" + utm_names[i]);
      }
    }
  }
}

var accountContainer = document.querySelector(".js-account");
var accountContainerSmall = document.querySelector(".js-account--small");
if (accountContainer && accountContainerSmall) {
  fetch("/account.json")
    .then((response) => response.json())
    .then((data) => {
      if (data.account === null) {
        accountContainerSmall.innerHTML =
          '<a href="/login" class="p-navigation__link-anchor">Sign in</a>';
        accountContainer.innerHTML =
          '<a href="/login" class="p-navigation__link-anchor" style="padding-right: 1rem;">Sign in</a>';
      } else {
        accountContainerSmall.innerHTML = `<span class="p-navigation__link-anchor">${data.account.fullname} (<a href="/logout" class="p-link--inverted">logout</a>)</span>`;
        accountContainer.innerHTML = `<div class="p-navigation__dropdown-link p-subnav">
            <a href="" class="p-navigation__link-anchor p-subnav__toggle" aria-controls="user-menu" aria-expanded="false" aria-haspopup="true">${data.account.fullname}</a>
            <ul class="p-subnav__items--right" id="user-menu" aria-hidden="true">
              <li><a href="/advantage" class="p-subnav__item">UA subscriptions</a></li>
              <li><a href="/account/payment-methods" class="p-subnav__item">Payment methods</a></li>
              <li>
                <hr class="u-no-margin--bottom">
                <a href="https://login.ubuntu.com/" class="p-subnav__item p-link--external">Account settings</a>
              </li>
              <li>
                <a href="/logout" class="p-subnav__item">Logout</a>
              </li>
            </ul>
          </div>`;
      }

      function toggleMenu(element, show) {
        const container = element.closest(".p-navigation__dropdown-link");
        var target = document.getElementById(
          element.getAttribute("aria-controls")
        );

        if (show) {
          container.classList.add("is-selected");
        } else {
          container.classList.remove("is-selected");
        }

        if (target) {
          element.setAttribute("aria-expanded", show);
          target.setAttribute("aria-hidden", !show);

          if (show) {
            target.focus();
            navDropdowns.forEach(function (dropdown) {
              closeMenu(dropdown);
            });
          }
        }
      }

      /**
        Attaches event listeners for the menu toggle open and close click events.
        @param {HTMLElement} menuToggle The menu container element.
      */
      function setupContextualMenu(menuToggle) {
        menuToggle.addEventListener("click", function (event) {
          event.preventDefault();

          var menuAlreadyOpen =
            menuToggle.getAttribute("aria-expanded") === "true";

          var top = menuToggle.offsetHeight;
          // for inline elements leave some space between text and menu
          if (window.getComputedStyle(menuToggle).display === "inline") {
            top += 5;
          }

          toggleMenu(menuToggle, !menuAlreadyOpen, top);
        });
      }

      /**
        Attaches event listeners for all the menu toggles in the document and
        listeners to handle close when clicking outside the menu or using ESC key.
        @param {String} contextualMenuToggleSelector The CSS selector matching menu toggle elements.
      */
      function setupAllContextualMenus(contextualMenuToggleSelector) {
        // Setup all menu toggles on the page.
        var userToggle = document.querySelector(contextualMenuToggleSelector);
        if (userToggle) {
          setupContextualMenu(userToggle);

          // Add handler for clicking outside the menu.
          document.addEventListener("click", function (event) {
            var contextualMenu = document.getElementById(
              userToggle.getAttribute("aria-controls")
            );
            var clickOutside = !(
              userToggle.contains(event.target) ||
              contextualMenu.contains(event.target)
            );

            if (clickOutside) {
              toggleMenu(userToggle, false);
            }
          });
        }
      }

      setupAllContextualMenus(".p-navigation__link-anchor.p-subnav__toggle");
    });
}
