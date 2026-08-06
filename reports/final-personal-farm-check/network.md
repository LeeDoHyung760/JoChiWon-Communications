# Final personal farm network check

- Test environment: development-only demo social account, authenticated cookie session, embedded MongoDB
- `GET /api/account/me/personal-farm`: HTTP 200
- Personal-farm entry call count: 1
- Authentication cookie included: yes (cookie value was not recorded)
- DTO parsing: succeeded; missing-document defaults and nested mission fields were present
- Personal-farm error toast count: 0
- `POST /api/account/me/personal-farm/garden/collect/iris`: HTTP 200, call count 1
- Failed requests during personal-farm entry: none
- Screenshots: intentionally not generated at the user's request

The flower interaction was exercised in the mounted game UI using the `flower-06`
garden interaction mapped to iris. The modal stayed open after collection, reopened
with the already-collected state, and returned focus to the canvas after Escape.
