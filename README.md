# KidRhythm

A parent-controlled daily routine planner with child profiles, practical activity suggestions, household lists and notes. Everything in the planner is saved in the current browser. No email or cloud account is required.

## Use the planner

Open the website and choose **Open your planner**. Add a child nickname, create time blocks, then choose activities that fit your available time, supplies and supervision. The schedule is a daily template, not a calendar or reminder service. Sample data is opt-in and clearly labeled.

Your entries are not uploaded or synchronized. Browser storage is not encrypted by KidRhythm: protect shared devices with a device lock and separate browser profile. Clearing site data can remove your plan. Saving failures are visible, and unreadable existing data is left untouched. See the website privacy page for details.

## Development

```sh
npm ci
npm run dev
npm run lint
npm run test:coverage
npm run build
```

The Vite build creates the planner in `dist`. Static public pages are copied from `public`. `vercel.json` routes `/` to the public landing and `/app/` to the planner with restrictive headers. [CI checks](docs/ci-cd.md) and [macOS development](docs/MACOS_APP.md) are documented separately.

## Advertising

Public pages include verification for the confirmed AdSense publisher and `ads.txt`. Active advertising is disabled pending site approval and reviewed consent setup. The planner loads no Google analytics or advertising. Publisher verification does not establish approval or income.

## Contributing

Report software problems using invented examples. Never post real child details, household notes, planner exports, passwords or access tokens in public issues. Run the checks above before proposing a change.

## License

[MIT](LICENSE). Third-party dependencies retain their own licenses.
