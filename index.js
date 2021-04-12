const { json } = require("express")
const express = require("express")
const fetch = require("node-fetch")
const storage = require("node-persist")

const app = express()
require("dotenv").config()

const { TWITCH_CLIENT_ID, TWITCH_SECRET, REDIRECT_URI } = process.env

app.get("/", (req, res) => {
  res.send("Hi").end()
})

app.get("/user", async (req, res) => {
  console.log("/user called")
  const result = await getUser()
  if (result != null) {
    res.json(result)
  } else {
    res.json({ success: false })
  }
})

app.get("/createStreamMarker", async (req, res) => {
  console.log("/createStreamMarker called")
  const result = await createStreamMarker()
  if (result != null) {
    res.json(result)
  } else {
    res.json({ success: false })
  }
})

app.get("/login", (req, res) => {
  const url = new URL("https://id.twitch.tv/oauth2/authorize")
  url.searchParams.append("client_id", TWITCH_CLIENT_ID)
  url.searchParams.append("redirect_uri", REDIRECT_URI)
  url.searchParams.append("response_type", "code")
  url.searchParams.append("scope", "user:edit:broadcast")
  res.redirect(url.href)
})

app.get("/oauth", async (req, res) => {
  const auth_code = req.query["code"]
  const url = new URL("https://id.twitch.tv/oauth2/token")
  url.searchParams.append("client_id", TWITCH_CLIENT_ID)
  url.searchParams.append("client_secret", TWITCH_SECRET)
  url.searchParams.append("code", auth_code)
  url.searchParams.append("grant_type", "authorization_code")
  url.searchParams.append("redirect_uri", REDIRECT_URI)
  const result = await fetch(url.href, { method: "POST" })
  const token_json = await result.json()
  if (token_json.access_token != null) {
    console.log("access_token received")
    await storage.setItem("accessToken", token_json.access_token)
    await storage.setItem("refreshToken", token_json.refresh_token)
    console.log("Authorized. You can now access the other endpoints")
  }
  res.json(token_json)
})

app.listen("3000", async () => {
  await storage.init()
  const username = await getUser()
  if (username != null) {
    console.log(`Logged in as ${username.data[0].login}.`)
  } else {
    console.log(
      "Not logged in. Please visit http://localhost:3000/login to log in"
    )
  }
  console.log("listening")
})

const getUser = async () => {
  const token = await validateAccess()
  if (token != null) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Client-Id": TWITCH_CLIENT_ID
    }
    const result = await fetch("https://api.twitch.tv/helix/users", { headers })
    const result_json = await result.json()
    if (result_json.data != null && result_json.data[0].login != null) {
      return result_json
    }
    console.log("Error getting user")
    console.log(result_json)
    return null
  }
}

const createStreamMarker = async () => {
  const token = await validateAccess()
  const user = await getUser()
  if(token != null && user != null) {
    const headers = {
      Authorization: `Bearer ${token}`,
      "Client-Id": TWITCH_CLIENT_ID,
      "Content-Type": "application/json"
    }
    const body = {
      user_id: user.data[0].id,
      description: "Marker created from API"
    }
    const result = await fetch("https://api.twitch.tv/helix/streams/markers", { method: "POST", headers, body: JSON.stringify(body) })
    const result_json = await result.json()
    if (result_json.data != null && result_json.data[0].created_at
       != null) {
      console.log(`marker created at ${result_json.data[0].created_at}`)
      return result_json
    }
    console.log("Error creating marker")
    console.log(result_json)
    return null
  }
}

const validateAccess = async () => {
  let accessToken = await checkAccessToken()
  if (accessToken != null) {
    return accessToken
  } else {
    console.log("Access token validation failed. Attempting refresh")
    const refresh = await refreshAccessToken()
    if (refresh != null) {
      accessToken = await checkAccessToken()
      return accessToken
    } else {
      return null
    }
  }
}

const checkAccessToken = async () => {
  const accessToken = await storage.getItem("accessToken")
  if (accessToken != null) {
    const url = "https://id.twitch.tv/oauth2/validate"
    const headers = {
      Authorization: `OAuth ${accessToken}`,
    }
    const result = await fetch(url, { headers })
    const result_json = await result.json()
    if (result_json.login != null) {
      return accessToken
    } else {
      console.log("Error validating access token")
      console.log(result_json)
      return null
    }
  } else {
    console.log("No access token available")
    return null
  }
}

const refreshAccessToken = async () => {
  const refreshToken = await storage.getItem("refreshToken")
  if (refreshToken != null) {
    const url = new URL("https://id.twitch.tv/oauth2/token")
    url.searchParams.append("client_id", TWITCH_CLIENT_ID)
    url.searchParams.append("client_secret", TWITCH_SECRET)
    url.searchParams.append("refresh_token", refreshToken)
    url.searchParams.append("grant_type", "refresh_token")
    const result = await fetch(url.href, { method: "POST" })
    const token_json = await result.json()
    if (token_json.access_token != null) {
      await storage.setItem("accessToken", token_json.access_token)
      await storage.setItem("refreshToken", token_json.refresh_token)
      return token_json.access_token
    } else {
      console.log("There was an issue refreshing the token.")
      console.log(token_json)
      return null
    }
  } else {
    console.log("No refresh token available.")
    return null
  }
}
