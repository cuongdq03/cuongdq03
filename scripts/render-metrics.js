const fs = require("fs");

const username = "cuongdq03";
const token = process.env.GITHUB_TOKEN;

async function githubAPI(query, variables = { login: username }) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data.data;
}

function createSVG(stats) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360">
  <defs>
    <linearGradient id="background" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>

    <linearGradient id="line" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00bfff"/>
      <stop offset="100%" stop-color="#58a6ff"/>
    </linearGradient>

    <style>
      .title { font-family: Arial, sans-serif; font-size: 27px; font-weight: 700; fill: #58a6ff; }
      .subtitle { font-family: Arial, sans-serif; font-size: 14px; fill: #8b949e; }
      .label { font-family: Arial, sans-serif; font-size: 14px; font-weight: 600; fill: #8b949e; }
      .value { font-family: Arial, sans-serif; font-size: 25px; font-weight: 700; fill: #f0f6fc; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="900" height="360" rx="20" fill="url(#background)" stroke="#30363d"/>

  <!-- Title -->
  <text x="450" y="42" text-anchor="middle" class="title">⚡ DYNAMIC GITHUB METRICS</text>
  <text x="450" y="65" text-anchor="middle" class="subtitle">github.com/${username}</text>

  <!-- Header line -->
  <rect x="40" y="82" width="820" height="2" fill="url(#line)"/>

  <!-- Repositories -->
  <rect x="35" y="105" width="190" height="100" rx="14" fill="#161b22" stroke="#30363d"/>
  <text x="55" y="135" class="label">REPOSITORIES</text>
  <text x="55" y="175" class="value">${stats.repositories}</text>

  <!-- Followers -->
  <rect x="250" y="105" width="190" height="100" rx="14" fill="#161b22" stroke="#30363d"/>
  <text x="270" y="135" class="label">FOLLOWERS</text>
  <text x="270" y="175" class="value">${stats.followers}</text>

  <!-- Following -->
  <rect x="465" y="105" width="190" height="100" rx="14" fill="#161b22" stroke="#30363d"/>
  <text x="485" y="135" class="label">FOLLOWING</text>
  <text x="485" y="175" class="value">${stats.following}</text>

  <!-- Stars -->
  <rect x="680" y="105" width="185" height="100" rx="14" fill="#161b22" stroke="#30363d"/>
  <text x="700" y="135" class="label">TOTAL STARS</text>
  <text x="700" y="175" class="value">${stats.stars}</text>

  <!-- Skills -->
  <text x="450" y="245" text-anchor="middle" class="subtitle">NETWORK ENGINEERING • CYBER SECURITY • LINUX • PYTHON</text>

  <!-- Live indicator -->
  <circle cx="345" cy="285" r="6" fill="#3fb950">
    <animate attributeName="opacity" values="1;0.25;1" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <text x="360" y="291" class="label">LIVE</text>
  <text x="450" y="291" text-anchor="middle" class="subtitle">Automatically updated by GitHub Actions</text>

  <!-- Animated scan -->
  <rect x="40" y="325" width="820" height="2" fill="#30363d"/>
  <rect x="40" y="325" width="120" height="2" fill="#00bfff">
    <animate attributeName="x" from="40" to="740" dur="3s" repeatCount="indefinite"/>
  </rect>
</svg>
`;
}

async function fetchAllRepoStars(login) {
  let stars = 0;
  let repoCount = 0;
  let after = null;
  let hasNextPage = true;

  const query = `
    query($login: String!, $after: String) {
      user(login: $login) {
        repositories(
          first: 100
          after: $after
          ownerAffiliations: OWNER
          privacy: PUBLIC
        ) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            stargazerCount
          }
        }
      }
    }
  `;

  while (hasNextPage) {
    const data = await githubAPI(query, { login, after });

    if (!data.user) {
      throw new Error(`User "${login}" not found or token lacks permission.`);
    }

    const repositories = data.user.repositories;
    repoCount = repositories.totalCount;

    stars += repositories.nodes.reduce(
      (total, repo) => total + repo.stargazerCount,
      0
    );

    hasNextPage = repositories.pageInfo.hasNextPage;
    after = repositories.pageInfo.endCursor;
  }

  return { repoCount, stars };
}

async function main() {
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN environment variable.");
  }

  const userQuery = `
    query($login: String!) {
      user(login: $login) {
        followers {
          totalCount
        }
        following {
          totalCount
        }
      }
    }
  `;

  const userData = await githubAPI(userQuery);

  if (!userData.user) {
    throw new Error(`User "${username}" not found or token lacks permission.`);
  }

  const { repoCount, stars } = await fetchAllRepoStars(username);

  const stats = {
    repositories: repoCount,
    followers: userData.user.followers.totalCount,
    following: userData.user.following.totalCount,
    stars,
  };

  const svg = createSVG(stats);

  fs.mkdirSync("assets", { recursive: true });
  fs.writeFileSync("assets/metrics.svg", svg.trim(), "utf8");

  console.log("Dynamic Metrics Updated");
  console.log(stats);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});