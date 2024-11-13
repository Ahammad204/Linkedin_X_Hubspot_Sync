// popup.js

// Event listener to save the profile when the button is clicked
document
  .getElementById("save-profile-btn")
  .addEventListener("click", saveProfileData);

// After OAuth authentication, you'll get the response from HubSpot with the access token

document
  .getElementById("check-profiles-btn")
  .addEventListener("click", checkAvailableOrNot);

document
  .getElementById("redirect-contact")
  .addEventListener("click", redirectContactPage);

function fetchProfileData() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: "getProfileData" },
      function (response) {
        if (response && response.success && response.profileData) {
          const profileData = response.profileData;

          chrome.storage.local.get(null, function (result) {
            const accessToken = result.access_token;
            const refreshToken = result.refresh_token;
            const firstName = profileData.firstname;
            const lastName = profileData.lastname;

            // Send a request to your backend
            fetch("http://localhost:3000/fetch-profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                firstName: firstName,
                lastName: lastName,
                accessToken: accessToken,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.error || data.category === "EXPIRED_AUTHENTICATION") {
                  // Token expired, attempt to refresh
                  fetch("http://localhost:3000/refresh-token", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                  })
                    .then((response) => response.json())
                    .then((data) => {
                      if (data.error) {
                        // Hide profile fields
                        document.getElementById("profile-info").style.display =
                          "none";

                        // Show re-login button
                        document.getElementById(
                          "reauthenticateButton"
                        ).style.display = "block";

                        // Show message indicating the session expired
                        document.getElementById("notification").innerText =
                          "😓 Oops! Your session has expired. Please log in again to continue. 🔑";

                        // Add event listener to the re-login button
                        document
                          .getElementById("reauthenticateButton")
                          .addEventListener("click", function () {
                            // Open LinkedIn profile page
                            chrome.tabs.create(
                              {
                                url: "https://www.linkedin.com/in/abdurrakib0/",
                              },
                              function (tab) {
                                // After the tab is created, use chrome.scripting.executeScript to open the popup in the LinkedIn tab
                                chrome.scripting.executeScript({
                                  target: { tabId: tab.id },
                                  func: openHubSpotLoginPopup,
                                });
                              }
                            );
                          });

                        // Optionally, hide the button after clicking it to prevent multiple clicks
                        document.getElementById(
                          "reauthenticateButton"
                        ).style.display = "none";
                      } else {
                        // Save the new access token and retry the save
                        chrome.storage.local.set({
                          access_token: data.access_token,
                        });
                        fetchProfileData();
                      }
                    });
                } else if (data.contactFound) {
                  document.getElementById("notification").innerText =
                    "👋 Welcome! Hope you’re doing well today! 😊";

                  const contact = data.contact;
                  // Populate the profile fields
                  document.getElementById(
                    "profile-name"
                  ).value = `${contact.properties.firstname} ${contact.properties.lastname}`;
                  document.getElementById("profile-headline").value =
                    profileData.headline || "";
                  document.getElementById("profile-location").value =
                    contact.properties.address || profileData.location || "";
                  document.getElementById("profile-company").value =
                    contact.properties.company || profileData.company || "";
                  document.getElementById("profile-jobtitle").value =
                    contact.properties.jobtitle || profileData.jobtitle || "";
                  document.getElementById("profile-lifecyclestage").value =
                    contact.properties.lifecyclestage ||
                    profileData.lifecyclestage ||
                    "Lead";
                  document.getElementById("profile-email").value =
                    contact.properties.email || profileData.email || "";
                  document.getElementById("show-message").innerText =
                    "Profile already exists in your CRM";
                  document.getElementById("check-profiles-btn").style.display =
                    "block";
                  document.getElementById("redirect-contact").style.display =
                    "block";
                  document.getElementById("save-profile-btn").style.display =
                    "none";
                } else {
                  document.getElementById("notification").innerText =
                    "👋 Welcome! Hope you’re doing well today! 😊";

                  document.getElementById("profile-name").value =
                    `${profileData.firstname} ${profileData.lastname}` || "";
                  document.getElementById("profile-headline").value =
                    profileData.headline || "";
                  document.getElementById("profile-location").value =
                    profileData.location || "";
                  document.getElementById("profile-company").value =
                    profileData.company || "";
                  document.getElementById("profile-jobtitle").value =
                    profileData.jobtitle || "";
                  document.getElementById("profile-lifecyclestage").value =
                    profileData.lifecyclestage || "Lead";
                  document.getElementById("profile-email").value =
                    profileData.email || "";
                  document.getElementById("show-message").innerText =
                    "This contact is not in your CRM";
                  document.getElementById("check-profiles-btn").style.display =
                    "none";
                  document.getElementById("redirect-contact").style.display =
                    "none";
                  document.getElementById("save-profile-btn").style.display =
                    "block";
                }
              })
              .catch((error) => {
                console.error("Error:", error);
                document.getElementById("notification").innerText =
                  "😓 Oops! Something wrong.";
              });
          });
        } else {
          console.error("Profile data not found or error occurred");
          document.getElementById("notification").innerText =
            "😓 Oops! No profile Found ";
          document.getElementById("profile-info").style.display = "none";
          document.getElementById("check-profiles-btn").style.display = "none";
          document.getElementById("redirect-contact").style.display = "none";
          document.getElementById("save-profile-btn").style.display = "none";
        }
      }
    );
  });
}

function saveProfileData() {
  const updatedProfileData = {
    firstname: document.getElementById("profile-name").value.split(" ")[0],
    lastname: document.getElementById("profile-name").value.split(" ")[1] || "",
    jobtitle: document.getElementById("profile-jobtitle").value,
    address: document.getElementById("profile-location").value,
    company: document.getElementById("profile-company").value,
    email: document.getElementById("profile-email").value,
    lifecyclestage: document.getElementById("profile-lifecyclestage").value,
  };

  // Check if the email is the default value
  if (updatedProfileData.email === "example@gmail.com") {
    document.getElementById("notification").innerText =
      "📧 Oops! It looks like you need to update your default email address. 🔄 Please make the change to continue.";

    return; // Stop further execution if the email is the default one
  }

  // Store the updated profile data in localStorage
  chrome.storage.local.set({ profileData: updatedProfileData }, function () {
    console.log("Updated profile data saved to .......");
  });

  // Fetch access token from chrome storage
  chrome.storage.local.get(null, function (result) {
    const accessToken = result.access_token;
    const refreshToken = result.refresh_token;

    if (accessToken) {
      // Proceed with saving the profile to the backend
      fetch("http://localhost:3000/save-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
          profileData: updatedProfileData,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.category === "EXPIRED_AUTHENTICATION") {
            document.getElementById("notification").innerText =
              "😴 It looks like the extension has gone to sleep. Please refresh the page to wake it up! 🔄";

            // Token expired, attempt to refresh
            fetch("http://localhost:3000/refresh-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.access_token) {
                  // Save the new access token and retry the save
                  chrome.storage.local.set({
                    access_token: data.access_token,
                  });
                  saveProfileData();
                }
              });
          } else {
            document.getElementById("notification").innerText =
              "🎉 Profile saved successfully! ✅ All set!";
          }
        })
        .catch((error) => {
          document.getElementById("notification").innerText =
            "😟 Something went wrong. Don’t worry, we’ll get it sorted! Please try again.";
        });
    }
  });
}

// Fetch profile data when the popup is opened
document.addEventListener("DOMContentLoaded", function () {
  fetchProfileData();
});

// Function to handle fetching the HubSpot token from LinkedIn's localStorage
function fetchHubSpotToken() {
  chrome.storage.local.get(["access_token"], function (result) {
    const accessToken = result.access_token;
    const refreshToken = result.refresh_token;
    if (accessToken) {
      console.log("Everything goes fine");
    } else {
      refreshAccessToken(refreshToken)
        .then((data) => {
          if (data.status === "error") {
            alert(`Failed to save ${data.message}`);
          } else {
            if (data.access_token) {
              chrome.storage.local.set({
                access_token: data.access_token,
              });
              console.log("Tokens stored:", data);
            }
          }
        })
        .catch((error) => {
          alert(`Error saving contact to HubSpot. ${error}`);
          console.log(error);
        });
    }
  });
}
async function refreshAccessToken(refreshToken) {
  const response = await fetch("http://localhost:3000/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  return response.json();
}

// Event listener for popup open
document.addEventListener("DOMContentLoaded", function () {
  // Fetch and display HubSpot token when popup is opened
  fetchHubSpotToken();
});

function checkAvailableOrNot() {
  chrome.storage.local.get(["access_token"], function (result) {
    const accessToken = result.access_token;
    const refreshToken = result.refresh_token;
    const email = document.getElementById("profile-email").value;
    const firstname = document
      .getElementById("profile-name")
      .value.split(" ")[0];
    const lastname =
      document.getElementById("profile-name").value.split(" ")[1] || "";

    // Check if the email is the default value
    if (email === "example@gmail.com") {
      document.getElementById("notification").innerText =
        "📧 Oops! It looks like you need to update your default email address. 🔄 Please make the change to continue.";

      return;
    }

    const profileData = {
      address: document.getElementById("profile-location").value,
      company: document.getElementById("profile-company").value,
      jobtitle: document.getElementById("profile-jobtitle").value,
      lifecyclestage: document.getElementById("profile-lifecyclestage").value,
    };

    // Send data to backend API
    fetch("http://localhost:3000/check-and-update-contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        firstname: firstname,
        lastname: lastname,
        accessToken: accessToken,
        profileData: profileData,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.category === "EXPIRED_AUTHENTICATION") {
          document.getElementById("notification").innerText =
            "😴 It looks like the extension has gone to sleep. Please refresh the page to wake it up! 🔄";

          // Token expired, attempt to refresh
          fetch("http://localhost:3000/refresh-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.access_token) {
                // Save the new access token and retry the save
                chrome.storage.local.set({
                  access_token: data.access_token,
                });
                checkAvailableOrNot();
              }
            });
        } else {
          document.getElementById("notification").innerText =
            "😴 It looks like the extension has gone to sleep. Please refresh the page to wake it up! 🔄";
        }
      })
      .catch((error) => {
        document.getElementById("notification").innerText =
          "😟 Something went wrong. Don’t worry, we’ll get it sorted! Please try again.";
      });
  });
}

function redirectContactPage() {
  chrome.storage.local.get(["access_token"], function (result) {
    const accessToken = result.access_token;
    const refreshToken = result.refresh_token;

    if (accessToken) {
      // Call HubSpot API to get the portal ID
      fetch("https://api.hubapi.com/integrations/v1/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.category === "EXPIRED_AUTHENTICATION") {
            // Token expired, attempt to refresh
            fetch("http://localhost:3000/refresh-token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refresh_token: refreshToken }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.access_token) {
                  // Save the new access token and retry the save
                  chrome.storage.local.set({
                    access_token: data.access_token,
                  });
                  redirectContactPage();
                }
              });
          } else {
            const portalId = data.portalId; // Extract the portalId

            // Redirect to HubSpot contact list
            const contactListUrl = `https://app.hubspot.com/contacts/${portalId}/objects/0-1/views/all/list`;
            window.open(contactListUrl, "_blank"); // Open in a new tab
            // Redirect to the contact list
          }
        })
        .catch((error) => {
          console.error("Error retrieving portal ID:", error);
          alert("Error retrieving your HubSpot portal ID.");
        });
    }
  });
}
function openHubSpotLoginPopup() {
  const clientId = "YOUR_HUBSPOT_CLIENT_ID"; 
  const redirectUri = "YOUR_REDIRECT_URI"; 

  // OAuth URL for HubSpot
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=crm.objects.contacts.write%20oauth%20crm.objects.contacts.read`;

  // Open a popup window for the OAuth authentication
  const width = 600;
  const height = 700;
  const left = window.innerWidth / 2 - width / 2;
  const top = window.innerHeight / 2 - height / 2;

  const popup = window.open(
    authUrl,
    "HubSpot Login",
    `width=${width},height=${height},top=${top},left=${left}`
  );

  // Poll for the URL change in the popup window to capture the access token
  const interval = setInterval(() => {
    try {
      if (popup.location.href.indexOf(redirectUri) === 0) {
        clearInterval(interval);
        const urlParams = new URLSearchParams(popup.location.search);
        const code = urlParams.get("code");

        if (code) {
          // Exchange the code for access token and refresh token
          fetch("http://localhost:3000/exchange-token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              code,
              grant_type: "authorization_code",
              client_id: "YOUR_CLIENT_ID",
              client_secret: "YOUR_CLIENT_SECRET",
              redirect_uri: "https://www.linkedin.com/in/abdurrakib0/",
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log(data);
              if (data.access_token) {
                chrome.storage.local.set({
                  access_token: data.access_token,
                  refresh_token: data.refresh_token,
                });
                console.log("Tokens stored:", data);
              } else {
                console.error("Error retrieving token.");
              }
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        }
        popup.close(); // Close the popup after receiving the code
      }
    } catch (e) {
      // Handle cross-origin issues
    }
  }, 1000);
}
