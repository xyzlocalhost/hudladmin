import { MOCK_DEVICES } from "@/lib/mock-fleet";

export type VaultItem = {
  id: string;
  label: string;
  username: string;
  password: string;
  url: string;
  deviceId: string;
  tags: string[];
  updated: string;
};

export function buildVault(): VaultItem[] {
  const seeds: Array<[string, string, string, string, string[]]> = [
    ["GitHub", "you@mail.com", "github.com", "home", ["dev", "ci"]],
    ["University portal", "st2024.you", "portal.uni.edu", "school", ["school"]],
    ["Acme Slack", "you@acme.io", "acme.slack.com", "co1", ["work", "acme"]],
    ["Acme Okta", "you@acme.io", "acme.okta.com", "co1", ["work", "acme"]],
    ["Northwind VPN", "you.nw", "vpn.northwind.local", "co2", ["work", "vpn"]],
    ["Northwind Jira", "you.nw", "northwind.atlassian.net", "co2", ["work"]],
    ["Orbit admin", "admin@orbit.co", "admin.orbit.co", "co3", ["work", "orbit"]],
    ["Orbit email", "you@orbit.co", "mail.orbit.co", "co3", ["work"]],
    ["Vercel", "you@mail.com", "vercel.com", "home", ["ci"]],
    ["Cloudflare", "you@mail.com", "dash.cloudflare.com", "home", ["infra"]],
    ["AWS root (personal)", "you@mail.com", "console.aws.amazon.com", "ai", ["infra"]],
    ["Cursor account", "you@mail.com", "cursor.com", "home", ["dev"]],
    ["Banking", "you.mobile", "bank.example", "travel", ["personal"]],
    ["Steam", "you.gamer", "store.steampowered.com", "media", ["personal"]],
    ["NAS admin", "admin", "nas.home.local", "backup", ["infra"]],
    ["Lab Wi‑Fi router", "admin", "192.168.1.1", "lab", ["infra"]],
  ];

  const extraHosts = ["Notion", "Linear", "Figma", "Discord", "Gmail", "Outlook", "Dropbox", "OneDrive", "Bitbucket", "Docker Hub", "npm", "Hugging Face", "OpenAI", "Anthropic", "Stripe", "PayPal", "Adobe", "Canva", "Zoom", "Teams", "LinkedIn", "Twitter/X", "Reddit", "Twitch", "Spotify", "Netflix", "University Wi‑Fi", "Library proxy", "Course LMS", "Moodle", "Gradle", "Azure", "Heroku", "Render", "Railway", "PlanetScale", "Supabase", "Firebase", "MongoDB Atlas", "Redis Cloud", "Datadog", "Sentry", "Postman", "1Password recovery", "Wi‑Fi guest", "Printer admin", "Camera NVR", "Smart home", "Domain registrar", "Email forwarding", "Tax portal", "Insurance", "Health portal", "Passport site"];

  const items: VaultItem[] = seeds.map(([label, username, url, deviceId, tags], i) => ({
    id: `v${i + 1}`,
    label,
    username,
    password: "••••••••••••",
    url,
    deviceId,
    tags,
    updated: `${(i % 12) + 1}d ago`,
  }));

  extraHosts.forEach((label, i) => {
    const d = MOCK_DEVICES[i % MOCK_DEVICES.length];
    items.push({
      id: `vx${i + 1}`,
      label,
      username: i % 3 === 0 ? "you@mail.com" : `user${i}@mail.com`,
      password: "••••••••••••",
      url: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
      deviceId: d.id,
      tags: i % 2 === 0 ? ["personal"] : ["work"],
      updated: `${(i % 20) + 1}d ago`,
    });
  });

  return items;
}

export const vaultItems = buildVault();
