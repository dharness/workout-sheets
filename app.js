let tokenClient;
let accessToken = null;

const signinBtn = document.getElementById("signin-btn");
const addDayBtn = document.getElementById("add-day-btn");
const statusEl = document.getElementById("status");

window.addEventListener("load", () => {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: handleTokenResponse,
  });

  signinBtn.addEventListener("click", () => {
    tokenClient.requestAccessToken();
  });

  addDayBtn.addEventListener("click", addNewDayTab);
});

function handleTokenResponse(response) {
  if (response.error) {
    statusEl.textContent = `Sign-in error: ${response.error}`;
    return;
  }
  accessToken = response.access_token;
  addDayBtn.disabled = false;
  statusEl.textContent = "Signed in.";
}

function formatTabName(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}${pad(date.getMinutes())}`;
}

async function addNewDayTab() {
  const title = formatTabName(new Date());
  statusEl.textContent = "Adding tab...";

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title } } }],
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json();
    statusEl.textContent = `Error: ${err.error?.message || res.statusText}`;
    return;
  }

  statusEl.textContent = `Added tab "${title}".`;
}
