const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

const PORT = 3000;

const clientId = "YOUR_CLIENT_ID"; // Replace with your HubSpot Client ID
const clientSecret = "YOUR_CLIENT_SECRET"; // Replace with your HubSpot Client Secret
const redirectUri = "YOUR_REDIRECT_URI"; // Replace with your Redirect URI

let refreshToken = ""; // Store refresh token securely (ideally in a database)

console.log("refresh token", refreshToken);

app.use(express.json());

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // You can set this to false if you don't need to send cookies
  })
);

app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Endpoint to exchange authorization code for tokens
app.post("/exchange-token", async (req, res) => {
  const { code } = req.body;

  if (!code) return res.status(400).json({ error: "Code is required" });

  try {
    const response = await axios.post(
      "https://api.hubapi.com/oauth/v1/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      })
    );

    const { access_token, refresh_token } = response.data;
    refreshToken = refresh_token;
    res.json({ access_token, refresh_token });
  } catch (error) {
    console.error(
      "Error exchanging code for token:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({
        error: "Error exchanging code for token",
        details: error.response ? error.response.data : error.message,
      });
  }
});

// Endpoint to refresh the access token using the refresh token
app.post("/refresh-token", async (req, res) => {
  if (!refreshToken)
    return res.status(400).json({ error: "Refresh token not available" });

  try {
    const response = await axios.post(
      "https://api.hubapi.com/oauth/v1/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      })
    );

    const { access_token } = response.data;
    console.log(access_token);
    res.json({ access_token });
  } catch (error) {
    console.error(
      "Error refreshing token:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({
        error: "Error refreshing token",
        details: error.response ? error.response.data : error.message,
      });
  }
});

// Endpoint to fetch contacts using the access token
app.get("/get-contacts", async (req, res) => {
  const accessToken = req.headers["authorization"]?.split(" ")[1];
  if (!accessToken) {
    return res.status(400).json({ error: "Access token is required" });
  }

  try {
    const response = await axios.get(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.json({
      contacts: response.data.results,
    });
  } catch (error) {
    console.error(
      "Error fetching contacts:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error: "Error fetching contacts",
      details: error.response ? error.response.data : error.message,
    });
  }
});
// Endpoint to save profile to HubSpot


app.post("/fetch-profile", async (req, res) => {
  const { firstName, lastName, accessToken } = req.body;

  console.log(req.body);

  if (!firstName || !lastName || !accessToken) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Prepare the name filters
  let nameFilter = [];
  if (firstName) {
    nameFilter.push({
      propertyName: "firstname",
      operator: "EQ",
      value: firstName,
    });
  }
  if (lastName) {
    nameFilter.push({
      propertyName: "lastname",
      operator: "EQ",
      value: lastName,
    });
  }

  try {
    // Call HubSpot API to search contacts by name
    const response = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        filterGroups: [
          {
            filters: nameFilter,
          },
        ],
        properties: [
          "firstname",
          "lastname",
          "email",
          "jobtitle",
          "address",
          "company",
          "lifecyclestage",
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.total > 0) {
      // If contact found, return it
      const contact = response.data.results[0];
      console.log(contact);
      return res.json({ contactFound: true, contact });
    } else {
      // If no contact found
      return res.json({ contactFound: false });
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Error fetching profile" });
  }
});

app.post("/save-profile", async (req, res) => {
  const { access_token, profileData } = req.body;

  console.log(req.body)

  try {
    const response = await axios.post("https://api.hubapi.com/crm/v3/objects/contacts", {
      properties: profileData,
    }, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(response.data)
    res.json(response.data);

  } catch (error) {
    console.error("Error saving profile data:", error);
    res.status(500).json({ error: "Failed to save profile data" });
  }
});

// Endpoint to update a HubSpot contact
app.patch('/updateContact', async (req, res) => {
  const { contactId, updatedProfileData, accessToken } = req.body;

  console.log(req.body)

  if (!accessToken) {
    return res.status(400).json({ error: 'Access token is missing' });
  }

  try {
    // Make a PATCH request to HubSpot API to update the contact
    const response = await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        properties: {
          firstname: updatedProfileData.firstname,
          lastname: updatedProfileData.lastname,
          email: updatedProfileData.email,
          address: updatedProfileData.address,
          company: updatedProfileData.company,
          jobtitle: updatedProfileData.jobtitle,
          lifecyclestage: updatedProfileData.lifecyclestage,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 200) {
      res.status(200).json({
        message: 'Contact successfully updated',
        contactId: response.data.id,
      });
    } else {
      res.status(response.status).json({
        error: 'Failed to update contact',
        message: response.data.message,
      });
    }
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Error updating contact in HubSpot' });
  }
});

// Function to check and update contact
app.post("/check-and-update-contact", async (req, res) => {
  const { email, firstname, lastname, accessToken, profileData } = req.body;

  if (!email || !firstname || !lastname || !accessToken) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Check if email is the default email
    if (email === "example@gmail.com") {
      return res.status(400).json({ error: "Please change the default email address." });
    }

    // Step 1: Search by email
    const emailFilter = [{
      propertyName: "email",
      operator: "EQ",
      value: email,
    }];
    const emailResponse = await axios.post(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        filterGroups: [{ filters: emailFilter }],
        properties: ["firstname", "lastname", "email"],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (emailResponse.data.total > 0) {
      // Contact found by email
      const contactId = emailResponse.data.results[0].id;
      const updatedProfileData = {
        firstname,
        lastname,
        address: profileData.address,
        company: profileData.company,
        email,
        jobtitle: profileData.jobtitle,
        lifecyclestage: profileData.lifecyclestage,
      };

      // Update contact
      const updateResponse = await axios.patch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
        { properties: updatedProfileData },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      return res.status(200).json({
        message: "Contact updated successfully",
        contactId: updateResponse.data.id,
      });
    } else {
      // Step 2: Search by name if no contact found by email
      const nameFilter = [];
      if (firstname) nameFilter.push({ propertyName: "firstname", operator: "EQ", value: firstname });
      if (lastname) nameFilter.push({ propertyName: "lastname", operator: "EQ", value: lastname });

      const nameResponse = await axios.post(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        {
          filterGroups: [{ filters: nameFilter }],
          properties: ["firstname", "lastname", "email"],
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (nameResponse.data.total > 0) {
        // Contact found by name
        const contactId = nameResponse.data.results[0].id;
        const updatedProfileData = {
          firstname,
          lastname,
          address: profileData.address,
          company: profileData.company,
          email,
          jobtitle: profileData.jobtitle,
          lifecyclestage: profileData.lifecyclestage,
        };

        // Update contact
        const updateResponse = await axios.patch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
          { properties: updatedProfileData },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        return res.status(200).json({
          message: "Contact updated successfully",
          contactId: updateResponse.data.id,
        });
      } else {
        // No contact found by name
        return res.status(404).json({ error: "Contact not found by email or name" });
      }
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "An error occurred while processing the request" });
  }
});

// Start the server on port 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
