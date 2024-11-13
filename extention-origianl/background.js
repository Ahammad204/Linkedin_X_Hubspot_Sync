chrome.runtime.onInstalled.addListener(() => {
  console.log("LinkedIn Profile Fetcher Extension installed.");
  // background.js

  // Open LinkedIn profile page
  chrome.tabs.create(
    { url: "https://www.linkedin.com/in/abdurrakib0/" },
    function (tab) {
      // After the tab is created, use chrome.scripting.executeScript to open the popup in the LinkedIn tab
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: openHubSpotLoginPopup,
      });
    }
  );
});

// Function to open the HubSpot login popup
function openHubSpotLoginPopup() {
  const clientId = "YOUR_HUBSPOT_CLIENT_ID"; // HubSpot Client ID
  const redirectUri = "YOUR_REDIRECT_URI"; // Redirect URI

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
