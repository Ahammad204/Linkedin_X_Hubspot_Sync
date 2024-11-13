// content.js

// Listen for the message from the popup to get profile data
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "getProfileData") {
    const nameElement = document.querySelector("h1.text-heading-xlarge");
    const headlineElement = document.querySelector(
      "div.text-body-medium.break-words"
    );
    const location = document
      .querySelector("span.text-body-small.inline.t-black--light.break-words")
      ?.textContent.trim();

    const companyButton = document.querySelector(
      "button[aria-label^='Current company:']"
    );
    const company = companyButton
      ? companyButton
          .querySelector("div.dlcybYDfjkXjnhkabEVzKvCRHFBkZMPCE")
          .textContent.trim()
      : "";

    const headline = headlineElement.textContent.trim();

    const firstname = nameElement.textContent.trim().split(" ")[0];
    const lastname = nameElement.textContent.trim().split(" ")[1] || "";
    const email = "example@gmail.com";

    console.log(firstname);
    console.log(lastname);
    console.log(email);
    console.log(location);
    console.log(headline);

    const profileData = {
      firstname,
      lastname,
      email,
      location,
      headline,
      company,
    };

    chrome.storage.local.set({ profileData: profileData }, function () {
      console.log("Profile data saved to chrome.storage");
    });

    // Send the response after successfully adding the profile data to the IndexedDB
    sendResponse({
      success: true,
      message: "Profile data saved successfully",
      profileData,
    });
  }

  // Return true to indicate you will send the response asynchronously
  return true;
});
