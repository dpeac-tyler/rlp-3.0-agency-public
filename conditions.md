

My question:

I'm working on a redesign of the RLP 2.x Conditions page. This is a pretty complex process and I'm looking to simplify it from a UX and UI perspective. I'm not saying its bad, I spent a lot of time on the original version. I'm just looking for alternatives or refinement ideas. 

Currently, Yes/No; Either/Or questions are built in the system and those question types can be configured to show and hide other questions. 

So as a basic either/or example: 
"Is your vehicle Owned or Leased?" 
User clicks "Leased"
User is presented with the lease agreement and must acknowledge that statement to continue. 

Yes/No; Either/Or questions must be set as required within the system. 

I've attached a screenshot of the setup page do you can understand what I was thinking.


Response:

The current design is logically sound, but it exposes the system’s rule structure more than the agency user needs. The biggest opportunity is to turn the configuration into a plain-language sentence.
Instead of:
IF → State → Value → DO → Show/Hide → Part

Use:
When [question] is answered [answer], show [question, section, document, or acknowledgment].

For your example:
When “Is your vehicle owned or leased?” is answered “Leased,” show “Lease agreement acknowledgment.”

What I would change
1. Remove “Is Equal To” and “Is Not Equal To”
For a required two-option question, these operators add unnecessary complexity. The agency user only needs to select the answer that triggers the condition.
Current:
- State: Is Equal To
- Value: Leased
Simplified:
- Answer: Leased
“Is not equal to” can create confusing inverse rules and is rarely needed when the question has only two answers.
2. Make “show” the standard behavior
I would strongly consider a show-only model:
The selected content is hidden initially and appears when the condition is met.

Allowing both Show and Hide makes agencies reason about initial visibility, inverse conditions, and potentially conflicting rules.
If both actions must remain available, label them more explicitly:
- Show when this answer is selected
- Hide when this answer is selected
3. Replace “Part” with the actual content type
“Part” is vague. Use a label such as:
What should appear?

The selector could group available items:
- Questions
- Sections
- Descriptions
- Documents
- Acknowledgments
After selection, display the item’s name in the rule rather than “Part.”
4. Use progressive disclosure
The screenshot shows every question expanded into a large rule card, even when nothing has been configured. That makes the page long and visually repetitive.
A better structure would be:
Conditional logic

5 eligible questions
2 rules configured

▾ Is your vehicle owned or leased?
  When the answer is: Leased
  Show:
  • Lease agreement acknowledgment

  [Add another item]  [Edit rule]  [Remove rule]

› Are there any outstanding judgments against you?
  No conditional logic configured

› Have you declared bankruptcy within the past 7 years?
  No conditional logic configured

This preserves the question-based organization but dramatically reduces scrolling.
5. Treat required status as an automatic rule
Because Yes/No and Either/Or questions must be required, I would not ask the user to configure that here.
Display a short informational message:
Questions used for conditional logic are required so the system can determine which content to display.

If the question becomes a trigger, the system could automatically make it required and show a lock or informational indicator in Question Builder.
6. Make revealed questions conditionally required
For the lease example, the acknowledgment should behave as:
- Hidden when “Owned” is selected
- Shown when “Leased” is selected
- Required only while shown
That relationship should be evident in the interface:
Lease agreement acknowledgment
Required when displayed

This avoids agencies wondering whether a hidden required question will block submission.
Recommended interaction model
I would separate authoring from reviewing:
1. Configure the rule alongside the trigger question in Question Builder.
2. Use the Conditions page as a compact overview of all configured relationships.
3. Let users edit a rule from either location.
The authoring panel could look like:
Conditional logic

Does this answer display additional content?
○ No
● Yes

When the answer is:
[ Leased                         ]

Show:
[ Lease agreement acknowledgment ]

[+ Add another item]

Then the Conditions page becomes an audit screen:
Trigger question	Answer	Result	Controls
Is your vehicle owned or leased?	Leased	Shows Lease agreement acknowledgment	Edit, Remove
Have you declared bankruptcy within the past 7 years?	Yes	Shows Bankruptcy details	Edit, Remove


This is easier to scan and makes relationships much easier to verify.
Other refinements worth considering
- Rename the page from Conditions to Conditional Logic or Question Logic.
- Replace individual Save and Clear buttons with Save rule and Cancel inside an edit panel.
- Allow several items to be added to one outcome without creating duplicate rules.
- Show a live summary before saving.
- Provide a Test logic mode where the agency selects answers and sees what appears.
- Warn about circular relationships, conflicting rules, deleted targets, and content that can never become visible.
- Show the number of affected items in collapsed rows, such as “Leased: shows 3 items.”
- Preserve the question’s authored answer labels, such as “Owned” and “Leased,” rather than translating them into generic values.
My preferred direction would be the plain-language rule builder combined with a compact Conditions overview. It retains the power of the current implementation while removing most of the programming-style concepts from the interface.




