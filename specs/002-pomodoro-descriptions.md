# 002: Pomodoro Descriptions

- **Release:** none

## Summary

Let the user add a short description to each focus session, for example "Write the report". The app stores the description with the session record in the browser storage and shows it in the history. Then the user can see what they did in each pomodoro.

## Requirements

### Description Input

1. The app shows a text field for the description of the current focus session. The field has a visible label, for example "What are you working on?".
2. The field is available before the focus session starts and while it runs or is paused.
3. The app does not show the field during a short break or a long break.
4. The description has a maximum of 100 characters. The field does not accept more characters.
5. The app removes spaces at the start and at the end of the description before it saves the description.

### Storage

6. When a focus session ends with no skip, the app adds the description to the session record.
7. If the description is empty, the record has no description.
8. After a focus session ends, the field is empty for the next focus session.
9. Reset and skip do not save the description. Reset keeps the text in the field. Skip clears the field.
10. Records without a description stay valid. This includes all records from before this spec.
11. If a stored description is not text, the app ignores only the description and keeps the record.

### History

12. Today's session list shows the description of each focus record that has one.
13. The user can edit the description of a focus record in today's list. The same rules apply: 100 characters at most, and spaces at the start and at the end are removed.
14. An empty description after an edit removes the description from the record.
15. The app saves an edit in the browser storage immediately. The edit stays after a page reload.

### Keyboard and Accessibility

16. When the focus is in a description field, the space key types a space. It does not start or pause the timer.
17. The Enter key in the edit field saves the edit. The Escape key cancels the edit.
18. All new controls have accessible names and work with the keyboard.

## Acceptance Criteria

1. Given a new visit, when the page loads, then the description field shows and is empty.
2. Given a running focus session with the description "Write the report", when the session ends, then today's list shows a focus record with "Write the report".
3. Given a running focus session with the description "  Read  ", when the session ends, then the stored description is "Read".
4. Given an empty description field, when a focus session ends, then the new record has no description.
5. Given a completed focus session, when the next focus session is selected, then the description field is empty.
6. Given a short break, when the page shows, then the description field does not show.
7. Given a running focus session with a description, when the user selects skip, then the history does not change and the description field is empty.
8. Given a running focus session with a description, when the user selects reset, then the field keeps the description.
9. Given text with 120 characters, when the user pastes it in the field, then the field contains only the first 100 characters.
10. Given a focus record with the description "Draft", when the user edits it to "Final draft" and presses Enter, then the list shows "Final draft" after a page reload.
11. Given a focus record with a description, when the user edits it to an empty value and saves, then the record has no description.
12. Given an edit in progress, when the user presses Escape, then the description does not change.
13. Given the focus in the description field, when the user presses the space key, then the field contains a space and the timer state does not change.
14. Given stored records from spec 001 with no description, when the page loads, then the app shows all records with no error.
15. Given a stored record where the description is a number, when the page loads, then the app shows the record with no description.

## Out of Scope

- Descriptions for breaks.
- Search or filter by description.
- Descriptions for records from days before today.
- Sign-in and server storage (later specs).

## Notes

- I chose to add descriptions to focus sessions only, because a "pomodoro" is a focus session.
- I chose 100 characters as the maximum, because the description is short.
- I chose to let the user edit descriptions in today's list, because users often forget to type the description before the session ends.
- Spec 001 says that the space key does not control the timer when the focus is in a form field. Requirement 16 depends on that rule.
