# Claude Code Bootstrap

Quick reference for session preferences and project locations.

## Git Workflow

**Always push to all three branches:**
```bash
git checkout main && git merge alpha && git push
git checkout prod && git reset --hard main && git push --force-with-lease
git checkout alpha
```

Working branch: `alpha`
Production branches: `main`, `prod`

## Key Locations

| What | Where |
|------|-------|
| **Feature Backlog** | `D:\Nirmanakaya_Book\MD Files of Corpus\Nirmanakaya_Feature_Backlog.md` |
| **Version File** | `lib/version.js` (also update `package.json`) |
| **Supabase Setup SQL** | `supabase-setup.sql` |
| **Supabase Triggers SQL** | `supabase-triggers.sql` |
| **Canon/Corpus** | `D:\Nirmanakaya_Book\` |
| **Dev Specs** | `dev/` folder (bug fixes, feature specs) |

## External Resources

- **Production Site**: www.nirmanakaya.com
- **Supabase Dashboard**: User manages directly
- **Feedback Email**: chriscrilly@gmail.com

## Version Bumping

When releasing:
1. Update `lib/version.js`
2. Update `package.json` version field
3. Commit and push to alpha, main, prod

## Community Hub (Supabase)

Tables: `profiles`, `readings`, `discussions`, `discussion_replies`

Key functions in `lib/supabase.js`:
- `ensureProfile()` - Creates profile if missing
- `getUnreadCount()` - For notification badge
- `updateLastHubVisit()` - Marks hub as read

## User Preferences

- Chris prefers concise communication
- Push to prod after major fixes
- Add backlog items to the Nirmanakaya_Book backlog, not local files
