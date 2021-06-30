import serialize from "../third-party/serialize";
import { whitepaperAfterSubmit } from "./form-access";

export function assignMarketoBackgroundSubmit() {
  const marketoForm = document.querySelectorAll("form[id^=mktoForm]");
  marketoForm.forEach(function (form) {
    form.addEventListener("submit", backgroundSubmitHandlerClosure());
  });
}

/**
 * Actions to take after form submission
 */
const afterFormSubmit = function (
  download_asset_url,
  return_url,
  isModal,
  thankYouMessage,
  marketoForm,
  isWhitepaper
) {
  // Now start the download
  if (download_asset_url) {
    const downloadFrame = document.createElement("iframe");
    downloadFrame.setAttribute("src", download_asset_url);
    downloadFrame.style.width = 0 + "px";
    downloadFrame.style.height = 0 + "px";
    document.body.insertBefore(downloadFrame, document.body.childNodes[0]);
  }

  // Redirect user back to the return url page
  if (return_url) {
    window.setTimeout(function () {
      window.location.href = return_url;
    }, 1000);
  }

  // If paginated modal, hide all pages except the last page - the thank you
  if (isModal) {
    const formPages = document.querySelectorAll(".js-pagination");
    if (formPages) {
      formPages.forEach((formPage) => {
        formPage.classList.add("u-hide");
      });
      const lastFormPageIndex = formPages.length - 1;
      const lastFormPage = formPages[lastFormPageIndex];
      lastFormPage.classList.remove("u-hide");
    }
  }

  // Add a thank-you fallback notification to the page
  // if someone submitted a form without a thank you action
  if (return_url === null && isModal === false && isWhitepaper === false) {
    if (thankYouMessage === null) {
      thankYouMessage =
        "Thank you<br />A member of our team will be in touch within one working day";
    }
    const feedbackArea = document.querySelector(".js-feedback-notification");
    if (feedbackArea) {
      feedbackArea.innerHTML =
        '<div class="p-notification--positive"><p class="p-notification__response">' +
        thankYouMessage +
        "</p></div>";
      const inputs = marketoForm.querySelectorAll("input, button");
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].disabled = "disabled";
      }
      const recaptcha = marketoForm.querySelector(".g-recaptcha");
      if (recaptcha) {
        recaptcha.classList.add("u-hide");
      }
      marketoForm.style.opacity = ".5";
    } else {
      document
        .getElementById("main-content")
        .insertAdjacentHTML(
          "afterbegin",
          '<div class="p-strip is-shallow u-no-padding--bottom"><div class="row"><div class="p-notification--positive"><p class="p-notification__response">' +
            thankYouMessage +
            "</p></div></div></div>"
        );
      window.scrollTo(0, 0);
    }
  }

  if (isWhitepaper) {
    whitepaperAfterSubmit();
  }
};

const backgroundSubmitHandlerClosure = function () {
  return function (submitEvent) {
    // Prevent normal submit
    submitEvent.preventDefault
      ? submitEvent.preventDefault()
      : (submitEvent.returnValue = false);

    // get form
    const marketoForm = document.getElementById(submitEvent.target.id);

    // Change the form's action location
    marketoForm.action = "/marketo/submit";

    // Submit the form in the background
    backgroundSubmit(marketoForm);
  };
};

const backgroundSubmit = function (marketoForm, submitCallback) {
  const request = new XMLHttpRequest();
  const submitUrl = marketoForm.getAttribute("action");
  let formData = serialize(marketoForm);

  request.open("POST", submitUrl, true);

  // Send the proper header information along with the request
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

  // When request has finished, call the callback function
  if (submitCallback) {
    request.addEventListener("readystatechange", function () {
      if (this.readyState == 4) {
        // Pass context and arguments on to submitCallback
        submitCallback.apply(this, arguments);
      }
    });
  }

  // recaptcha test
  const recaptchaListElement = marketoForm.getElementsByClassName(
    "g-recaptcha"
  )[0];
  const recaptchaWidgetId = recaptchaListElement.dataset.widgetId;
  const response = grecaptcha.getResponse(recaptchaWidgetId);
  const already_errored = document.getElementById("recaptcha-msg");
  if (response === "") {
    if (!already_errored) {
      recaptchaListElement.classList.add("recaptcha-is-error");
      recaptchaListElement.insertAdjacentHTML(
        "afterend",
        '<p id="recaptcha-msg" class="p-form-validation__message" role="alert"><strong>Error:</strong> You need to complete the recaptcha to submit this form. </p>'
      );
    }
    return false;
  } else {
    if (already_errored) {
      recaptchaListElement.classList.remove("recaptcha-is-error");
      const msg = document.getElementById("recaptcha-msg");
      msg.parentNode.removeChild(msg);
    }
  }

  // copy recaptcha to marketo field
  formData = formData.concat("&grecaptcharesponse=" + response);

  // Send off the POST request
  request.send(formData);

  // get the download asset if it exists
  let download_asset_url = marketoForm.querySelector(
    "input[name=download_asset_url]"
  );
  if (download_asset_url != null) {
    download_asset_url = download_asset_url.value;
  }

  // get the return url if it exists to redirect users after
  let return_url = marketoForm.querySelector("input[name=returnURL]");
  if (return_url != null) {
    return_url = return_url.value;
  }

  // check if it is a dynamic modal form
  const isModal = marketoForm.classList.contains("modal-form");

  // check if it is a whitepaper
  const isWhitepaper = marketoForm.classList.contains("whitepaper-form");

  // check if there is a thank you message to post
  let thankYouMessage = marketoForm.querySelector(
    "input[name=thankyoumessage]"
  );
  if (thankYouMessage != null) {
    thankYouMessage = thankYouMessage.value;
  }

  // reset form and captcha
  if (!document.querySelector(".js-feedback-notification")) {
    marketoForm.reset();
  }
  grecaptcha.reset();

  // deal with the post submit actions
  afterFormSubmit(
    download_asset_url,
    return_url,
    isModal,
    thankYouMessage,
    marketoForm,
    isWhitepaper
  );

  return true;
};
