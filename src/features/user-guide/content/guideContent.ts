import type { BuiltInDesignation } from '../../../config/access';

/**
 * The user guide: what every role does and how work moves between them. The User Guide page and its PDF downloads
 * both read only this file.
 *
 * KEEP IT IN STEP WITH THE APP. Any change to a workflow, a status, a menu item, an approval or who holds a permission
 * (Procurement DesignationAccess) must update the matching role, flow and GUIDE_CHANGELOG entry here in the same change.
 * guideContent.test.ts fails when a designation, menu item or actor is missing.
 */

/** Everyone the guide can be written for: the ten designations, plus dealers signed in to their portal. */
export type GuideRoleId = BuiltInDesignation | 'DEALER';

/** People and systems that take part in a flow without being a role of this app. */
export type GuideExternalActor = 'CUSTOMER' | 'SYSTEM';

export type GuideActor = GuideRoleId | GuideExternalActor;

export interface RoleGuide {
  id: GuideRoleId;
  name: string;
  /** One sentence: what the job is. */
  summary: string;
  /** Sidebar items (APP_NAVIGATION ids) this role sees, in sidebar order. My Profile is always there too. */
  menu: string[];
  /** Menu items that appear only at Level 2 (the approval queues). */
  levelTwoMenu?: string[];
  /** Whether Level 2 adds approval powers. When false the role always works at Level 1. */
  hasApprovalLevel: boolean;
  /** What the role does day to day (both levels). */
  does: string[];
  /** What a Level 2 holder of this role approves or decides. Empty when the role has no approvals. */
  approves: string[];
  /** Short practical notes. */
  tips: string[];
}

export type StepKind = 'maker' | 'checker' | 'external' | 'end';

export interface FlowStep {
  /** Who can do this step. A role is "in" a flow when it appears here. */
  who: GuideActor[];
  /** How the actor is shown on the step, e.g. "Dealer Manager · Level 2". */
  label: string;
  kind: StepKind;
  /** What happens, in plain words. */
  text: string;
  /** Where in the app, e.g. "Approvals Hub › Dealers". */
  where?: string;
  /** What happens otherwise (reject, failure). */
  otherwise?: string;
}

export interface GuideFlow {
  id: string;
  title: string;
  summary: string;
  steps: FlowStep[];
}

export interface GuideChange {
  /** YYYY-MM-DD */
  date: string;
  changes: string[];
}

/** Bump with every guide update; printed on the page and on every PDF. */
export const GUIDE_VERSION = '2.48';
export const GUIDE_UPDATED = '2026-11-06';

export const GUIDE_CHANGELOG: GuideChange[] = [
  {
    date: '2026-11-06',
    changes: [
      'Quotations now carry a payment plan (Orders Management › Create / Edit, and a dealer\'s My Quotations): the advance and midterm percentages, 30% and 30% to start with and both editable, and the final part worked out by itself as the rest of 100% (30% + 30% leaves 40%), paid only after the delivered units are tested. The midterm part is optional: untick "Midterm payment" for a dealer who wants only an advance and the final payment (30% advance leaves 70% after testing), and no midterm payment is then asked for or accepted. The quotation also says how the dealer expects to be paid: cash, online payment, bank to bank transfer or cheque. Advance and midterm together can\'t be more than 100%. A dealer\'s change to the plan is a change request like any other, and approvers see the old and new plan. The quotation, purchase order and bill print the payment terms.',
      'Orders Management › the order › Payments to the dealer (Dealer Manager, Finance Manager, Super Admin): record what was actually paid against each part of the plan, any amount (25% or 50% instead of the planned 30% is fine), with the method, date and reference. Someone else confirms it (Approvals Hub › Dealer payments, Level 2); only confirmed payments count. The advance can be paid once the order is approved and the midterm once the dealer has shipped; until the units are tested at most the advance and midterm parts can be paid. Your own entry can be corrected or withdrawn while it waits; a confirmed one is reversed (and the reversal confirmed). Everyone who sees orders sees the paid, refunded and still-to-pay figures; marking an order delivered shows them too.',
      'Testing decides the final payment: once the stock entry is approved the order is worth only the units that passed (with shipment and GST), and the final part can be paid up to that. If more was paid (units failed testing, or the order was cancelled or returned after a payment), a refund claim against the dealer opens by itself, with the failed units, and the dealer and payments team are told. A Level 2 can change the amount to be refunded, with a reason; recording and confirming the dealer\'s refund settles it. Dealers see their payments and any refund they owe in My Orders.',
      'Products Management › View details (the eye) now opens the product in the same frame as Create and Edit: the same parts (Basics, Price & GST, Images & specs, Components & barcodes, Costs, Warranties, Accessory) in the same order, with Back / Next, and every field shown as it would be filled in but not editable. There is nothing to save; Close leaves it. The unit barcodes and the cost sheet load only when their part is opened.',
      'Product Management has a new Stock entry tab (Fulfillment Specialist, Super Admin) for adding units to a product. Add stock (+) on a product opens it there. Units to add is a list of only the units the components in stock can build: a product using one motherboard and two touch panels, with 5 motherboards and 10 touch panels in stock, offers 1 to 5. Only pieces with a barcode count, and the line under it names the component that limits the count. When not one unit can be built (no complete set in stock, or a product without components), Units to add shows 0 and can\'t be changed, "No component available" says why, and there are no rows to fill in. The grid then has one row per unit, a column for the unit\'s own barcode and one column per piece fitted into it (a USB cable used twice per unit gets USB Cable #1 and #2). So every row says exactly which pieces went into which unit. A scanner\'s Enter moves to the next cell, and a block copied from a spreadsheet (rows on lines, cells side by side) can be pasted into the first cell. The unit\'s barcode is new, so it is typed or scanned. Clicking a piece cell drops down that component\'s pieces in stock (pieces already entered in another cell are left out): pick one, type to narrow the list (arrow keys and Enter work too), or scan. A code entered twice is marked red. A draft saved with more units than the components in stock now allow can\'t be saved or added until Units to add is lowered.',
      'Stock entry › Save draft: keep a stock entry part-filled and continue later, on any computer. The Drafts list shows each product\'s draft, how many units are complete and who saved it last; Add stock on a product with a draft continues it. Each product has at most one draft, shared by the team. Saving checks every code: a unit barcode already in use, a piece that is not in stock or is a piece of another item, or a code already in another product\'s draft is refused, and its cell is marked. A draft takes nothing from item stock.',
      'Stock entry › "Add N units to stock" becomes available once every unit is complete. The stock is added only then, with each unit and its own pieces; if it is refused (e.g. a piece was used meanwhile), the draft stays and the cells are marked. Reduce stock (−) stays a pop-up and only takes units out.',
    ],
  },
  {
    date: '2026-11-04',
    changes: [
      'Promo Codes: a code for chosen customers is now shown in full only to the Super Admin. Everyone else sees TINQA*************** (with a crossed-out eye), can\'t copy it, and finds it by search only by TINQA. Orders that used it show it the same way. A code for every customer is shown in full to everyone who sees promo codes; the Super Admin can copy any code (the copy button next to it).',
      'Promo Codes › the code › Customers (Super Admin, Store Manager, Store Sales Agent, Customer Support): "Email code" next to a customer, or "Email all", sends them an email with the code, what it is for (the description), the discount, the products and the dates, after confirming. Each customer shows when they were last emailed it. Only a code that is active or scheduled can be sent, and only to its own customers; send it again whenever needed. A code for every customer is never emailed.',
      'Promo Codes › the code › "Show on storefront" (the same staff, codes for every customer only): every visitor of the website then sees the code and its offer (e.g. "Diwali offer: 20% off every product with code TINQA… until 3 May 2027") at the top of every page and at checkout, where "Use" applies it in one click. "Remove from storefront" takes it off again. A switched-off, expired or used-up code disappears from the website by itself; a code changed to chosen customers is taken off.',
      'Promo Codes › New promo code: codes are now at least 20 characters: TINQA followed by 15 to 25 random capital and small letters (no digits), e.g. TINQAhRtKwPzMbQeNcYvD. The suggested code has this shape; a typed one must too. Capital and small letters matter: the customer types the code exactly as it was given (only TINQA may be typed in small letters). Codes made before keep working as they are.',
      'Promo Codes › New promo code and Edit: the discount can now be a percentage or an amount in rupees (above ₹0, at most ₹1,000), never both. Choose "Percentage (%)" or "Amount (₹)" under "Discount as"; the other box is then disabled and cleared. An amount is taken off the list price of each unit the promo works on and, like a percentage, replaces the product\'s own discount (₹1,000 at 5 % off with a ₹200 promo costs ₹800). A unit is never made free. The list shows 20% or ₹200; at checkout the customer sees "20% off" or "₹200 off each".',
      'Promo Codes (Super Admin, Level 2): a code can now be deleted, from the list or the code, after confirming. A deleted code disappears from the list and nobody can use it; orders already placed keep their discount and its use history stays. Choose "Deleted" in the Status filter to find it and press Restore: it comes back as it was (switched on or off) and can be edited again. Its code stays taken, so a new code can\'t reuse it.',
      'Promo Codes › New promo code and Edit: with chosen products, each product now has its own units right after it: "All units" or a number (RudraX on 1: three RudraX in the cart get the promo on one; the other two keep their normal price). With all products, one "Units per product" number still applies to every product. Codes made before keep their units on each chosen product.',
      'Promo Codes › Edit: the code itself (e.g. TINQADIWALI26) can never be changed once created, used or not. Everything else can: the discount, the customers, the products and their units, the limits, the dates and switching it on or off.',
      'New Promo Codes menu (Super Admin, Store Manager, Store Sales Agent, Customer Support, Finance Manager, Financial Auditor): every promo code with its status (Active, Scheduled, Expired, Used up, Switched off), discount, who and which products it is for, its dates, how often it was used and the discount it gave. Search by the start of the code (e.g. TINQA7K) and filter by status. Open a code to see its customers, products and limits; "Use history" lists every order that used it, with the customer, the units discounted and the discount (a cancelled order gives its use back). Tell customers which code to use: the website never shows or suggests one.',
      'Promo Codes › New promo code (Super Admin, Level 2): the code is suggested (TINQA + 8 characters); keep it, press "Suggest another" or type your own (TINQA followed by 3 to 15 capital letters or digits). Set the discount % (above 0, below 100), the customers (all, or chosen ones by search) and the products (all, or chosen ones), on how many units of each product it works (empty = every unit; with 1, three RudraX get the promo on one), uses per customer (one time, 2, unlimited or a number), total uses (unlimited or a number) and how long it is valid (6 months, 1 year, 2 years or your own dates, both days included). The promo replaces the product\'s own discount, it is never added to it: ₹1,000 at 5 % off with a 20 % promo costs ₹800, not ₹750.',
      'Promo Codes (Super Admin, Level 2): edit a code, or switch it off (after confirming) and back on, from the list or the code. Once a code has been used, the code itself can\'t change; its other settings can, for later orders.',
    ],
  },
  {
    date: '2026-11-04',
    changes: [
      'Store Sales › New sale: the Search products box also takes a unit\'s barcode. Scan it (or type it and press Enter) and the product it belongs to is shown, ready to add. Names still match as you type. A unit that is not in stock, a product that is not on sale and a component piece\'s barcode are each named, and an unknown barcode says so. The agent sees only which product the unit is, not its parts or where they came from.',
    ],
  },
  {
    date: '2026-11-03',
    changes: [
      'My Demos is now only for the roles that go on client demos: Super Admin, Store Manager, Finance & Accounts Manager and Store Sales Agent (their new permission group "Client demos - attend demos"). Delivery riders, fleet coordinators, warehouse, support, catalog, dealer and audit staff no longer see it. Only staff in these roles are offered as attending staff when a demo is planned, and the server refuses anyone else. Someone already tagged on a demo stays on it. A custom role can include the group to send its holders on demos.',
      'Products can now name the software they run and its version (optional), e.g. TinQa OS 2.1.0, like iOS on a phone. Create and Edit Product › Basics has a highlighted Software box: fill in both the name and the version, or leave both empty. A new version starts with the software of the one it is copied or adapted from. Changes are listed for the approver like any other change.',
      'On the website, the product view now lists the Highlights once, as a checklist under the description, followed by one Specifications list with the software and its version and the warranty. A specification that only repeats a highlight (e.g. "Lighting: Warm-white LED" next to the highlight "Warm-white LED sunrise cycle") is left out, so write each fact once.',
    ],
  },
  {
    date: '2026-11-03',
    changes: [
      'In the 3D store, a product\'s other pictures are now looked through right on its own display on the table: when the visitor taps a product, walks up to it, or Aura is telling them about it, arrows appear either side of its photo, above its name and price, to go to the next or previous picture (the big screen follows). The separate picture strip at the top of the screen is gone. Every other product keeps its main photo, and a product with one picture shows no arrows.',
    ],
  },
  {
    date: '2026-11-03',
    changes: [
      'Edit Product now looks and works exactly like Create Product: the same wide form in parts (Basics, Price & GST, Images & specs, Components & barcodes, Costs, Warranties, Accessory), the same field layout, Back / Next with "Step x of y", and the same markers for a part that has an error or still needs something. It opens on Basics; "Product is Enabled" is in Basics and the stock (changed only with Add/Reduce stock) in Price & GST. A save the server refuses opens the part with the error. "Nothing changed yet" shows until you change something.',
      'Image names no longer have spaces, dashes or other symbols: the product name\'s letters and digits run together, then _version, then _image number. "Rudra X" v0.1 gives rudrax_v0.1_1, "Tail-X 200" gives tailx200_v0.1_1. Pictures named the old way (e.g. rudra-x_v0.1_1) must be renamed; images already saved stay as they are until replaced.',
    ],
  },
  {
    date: '2026-11-03',
    changes: [
      'Product images are now found for you. In Images & specs, type only the image folder address once (e.g. http://localhost:3000/public/products; it is remembered on this computer). Each of the five views shows its image name, made from the product name, its version and its slot, which can\'t be edited: image 1 of RudraX v0.1 is rudrax_v0.1_1, image 2 rudrax_v0.1_2, and so on (spaces and symbols are left out: "Rudra X" gives rudrax_v0.1_1). There is nothing to add or type per image.',
      'Each view looks for its picture in the folder under its name, as .png, .jpg, .jpeg or .webp, and shows it when found; describe each picture found. A view whose picture isn\'t there shows a blank picture and its name: select the name, copy it and rename your file to it. Back in the form after renaming, it is found by itself. Only pictures found are saved; image 1 is required.',
      'Renaming a product or creating a new version gives its images the new names (e.g. rudrax_v0.2_1), so rename the files too. When you save, the server checks every new or changed image is named this way, for the version it actually gives the product, and says which name it expects if not.',
      'Images saved before names were made automatically stay as they are, marked in amber, until a picture with the standard name is in the folder; then that one is used.',
      'Create Product (and Finish Draft) is now a wide form in parts, one tab at a time: Basics (title, tagline, model, category, description), Price & GST, Images & specs, Components & barcodes, Costs (only if you can see costs), Warranties and Accessory. Move with the tabs on the left, or Back and Next. Each tab shows a dot: amber while something there is still needed to create or submit the product, green when it is all filled in, red when a field there has an error. "Still needed" next to the main button lists the parts left. Save as draft works from every tab, and nothing typed is lost when you switch. If a save finds a problem, the form opens the tab that has it.',
      'Product descriptions now follow one template, so every product reads alike on the website and Aura can compare them: Overview (the theme, in 1–2 sentences), The Story (why the subject matters), Technology (how the LEDs and AI bring it alive), Craftsmanship (materials, scale, finish), Perfect For (who it suits and where it fits) and Highlights (3–5 short points, one per line). Each section has its own box with a hint and a suggested length; empty sections are left out, and the whole description is still at most 2,000 characters.',
      '"Suggest descriptions" in the product form: type what the miniature shows (the title is filled in, e.g. Kedarnath) and press Suggest. TinQa looks it up on Wikipedia (free, once per subject) and writes three versions from it and the product\'s tagline and specifications: Heritage (leads with the story), Technology (leads with the LED and AI experience) and Gift & décor (leads with who it is for). "Use the … version" fills every section, and "Undo suggestion" puts back what you had. Check every claim and rewrite in your own words before saving. Nothing found, or the lookup unavailable? The versions are written from the product\'s own details and The Story is left for you.',
      'Descriptions written before the template open in Overview: move each part into its section the next time you edit the product. On the website they show as before until then.',
      'Product images now follow one theme, so every product looks alike: image 1 is always the front view, 2 the side view, 3 the back view, 4 a close-up of the detail and 5 the product in use (or in a room, to show its size). Create and Edit Product show the five slots with what to photograph in each; leave a slot empty if you have no picture for it, and the others stay in their places. Image 1 is required.',
      'Each image needs a description of what that picture shows of the product (up to 400 characters), e.g. "From the side: the frame is only 4 cm deep, so it hangs flat." It is required for every image of a new product or submitted draft, and for any image you add or replace. Images saved before this keep working without one until they are replaced; a description, once given, can be changed but not removed. A change of image or description is listed for the approver like any other change.',
      'On the website each picture\'s description is its caption in the product view. In the 3D store, Aura walks the visitor through a product\'s pictures: she puts each one on the big screen, in the order above, and reads out its description ("Show me the pictures", "the back of it", "next picture").',
    ],
  },
  {
    date: '2026-10-31',
    changes: [
      'Meetings: nobody can be in two meetings at once. A meeting takes one day, from a start to an end time picked on the clock (hour, then minute). Time when you or anyone you invite is already in another scheduled meeting is greyed out on the clock and listed under it. If an invitee added later is busy at the chosen time, an amber warning names them, the other meeting and its time, and the meeting can\'t be scheduled until you pick another time or invite someone else. The same applies when you change a meeting\'s time or invite more people. People who declined or were replaced, and cancelled or completed meetings, don\'t count.',
    ],
  },
  {
    date: '2026-10-31',
    changes: [
      'My Meetings has moved from the side menu to the top bar: the meeting (group of people) icon beside the notification bell opens it. A green count on the icon shows the meetings still waiting for your feedback.',
      'Client Outreach (new menu): keep a record of every call, email, WhatsApp message or visit to a business you pitch to, such as a hotel. Look the business up first to see who contacted it before, when, what they said and how often they asked for a demo. Each entry has a summary, their response, how it went (Excellent to Worse), their interest (Interested, Maybe, Later, Not interested) and the next step: call back, demo or meeting requested, with a date. Email or WhatsApp screenshots can be attached as proof. On the follow-up day you get a reminder at 9 am. The summary shows how many businesses each executive contacted per day. A business can\'t be added twice with the same phone or email.',
      'Custom roles: an admin who manages employees can create a new role, such as Marketing Executive, in Employee Management › Roles & permissions, by picking permission groups. You can only give groups you hold yourself. Level 1 and Level 2 work as for the built-in roles. A role that employees hold can be deactivated but not deleted. Changes reach its employees when they next sign in.',
      'Meetings: Client Demos & Meetings now has a Demos tab and a Meetings tab. Store Managers, Finance & Accounts Managers, Fulfillment staff, Financial Auditors and Super Admins schedule online meetings (paste the Meet, Teams or Zoom link) or face-to-face meetings (place, address and Google Maps link), with the subject, description, client and attendees. No approval is needed; TinQa gives each meeting an ID such as MTG-2026-0001.',
      'Invitees are emailed and notified at once, and again 24 hours before the meeting. An invitee can decline with a reason only within 24 hours of being invited; after that they must attend. The organiser can invite someone else in place of a person who declined, edit or cancel the meeting, and mark it completed. Every attendee is then asked for feedback (agenda, feedback, what was decided, whether a deal was confirmed). My Meetings (the meeting icon beside the bell) shows your meetings, with a badge for feedback still to give.',
    ],
  },
  {
    date: '2026-10-31',
    changes: [
      'Products now have a model name and a version. Every product needs its own model name (e.g. RX-200) to be created or submitted; no two products can share one, whatever the capitals. A draft may wait for it. Products created earlier have none until they are next edited, and the list shows "No model name yet" for them.',
      'Products with the same title are versions of one product: the first is v0.1, then v0.2 … v0.9, v1.0, v1.1 and so on. The version is given automatically when the product is saved and is shown next to the model name in the form and in the list. Renaming a product makes it the newest version of its new title.',
      'Adapt a new version from an existing one: in Create Product, start typing the title (or a model name). Every version with a matching title or model name is listed, e.g. RudraX v0.1 and RudraX v0.2; pick any of them and the whole form is filled with its description, price, GST, images, specifications, components, warranties, costs and accessory settings. Change what is different, enter the new model name and scan the unit, then create it as usual. "Start blank" empties the form again. When the new version is approved and turned on, the version it was adapted from is turned off.',
      'The model name and version ("Model RX-200 · Version v0.2") are written at the bottom of the product\'s description on the website, so customers can tell the versions apart. The product form shows the line under the description as you type.',
      '"Create new version" of a sold product now gives the copy the next version of its title (e.g. v0.3). Give the copy its own model name before submitting it. A version can be copied again once its earlier copy has been submitted.',
      'Approvers see the model name of a product waiting for approval, and a model name change in the list of changes.',
    ],
  },
  {
    date: '2026-10-30',
    changes: [
      'New Careers menu (Super Admin, Store Manager, Catalog Specialist): post job openings for the website\'s Careers tab and work through the people who apply. Each opening gets its job ID (JOB-2026-0007) automatically. Fill in the title, team (pick one or type a new one), location, work mode, employment type, experience and salary range (show the salary on the website or keep it hidden), positions, summary, description, responsibilities, must-have requirements, nice-to-haves, benefits, skills, education and the deadline; a preview shows the card as candidates will see it. Openings are saved as drafts, then published, closed and reopened. A deadline that has passed can\'t be published.',
      'Careers › an opening (or All applicants): every applicant with their status, résumé match, experience and next interview. Filter by status (New, Awaiting L2, Shortlisted, Interviewing, Selected, Rejected, Withdrawn) and by match (Strong, Weak, No match), search by name, email, phone or reference, and sort by newest, oldest, best match or experience.',
      'Careers › Careers tab on the website: shows whether the website shows the Careers tab, and who changed it last. Only a Super Admin at Level 2 can hide it (after confirming) or show it again. While it is hidden the tab, the open roles and the apply form disappear from the website and nobody can apply; openings and applicants stay here to work on.',
      'Candidates need no account on the website, but before they can send an application they confirm their email with a 5-digit code we email them, so every hiring email reaches the right person. The application shows "Email verified" with the time.',
      'Careers › an application: the candidate\'s details, links, cover note and current and expected CTC; the résumé PDF, shown on the page when you press Show résumé (and downloadable); the timeline; and every email sent to the candidate.',
      'Résumé match: the portal compares the résumé\'s text with the opening in your browser (skills 50 %, requirements 25 %, experience 15 %, education 5 %, nice-to-haves 5 %) and labels it Strong (70 or more, green), Weak (40–69, amber) or No match (grey). It understands common names for the same skill (AutoCAD and Auto CAD, STM32 as a microcontroller, SAP MM as ERP…) and shows the skills found and missing, how the experience fits and why. It is saved the first time a screener opens the application; Re-run match saves it again. A scanned résumé without text says "Résumé has no readable text — review manually".',
      'Hiring steps: Level 1 shortlists (with a note) and a Level 2 approver confirms it; then interviews are scheduled; once an interview is passed, Level 1 selects the candidate and a Level 2 approver confirms that too. Reject (with a reason, emailing the candidate unless you untick it) or mark withdrawn at any step. Nobody confirms a shortlist or selection they asked for.',
      'Interviews take place on Microsoft Teams, Google Meet or Zoom, by phone or in person, not in TinQa. Create the meeting there, paste its link (any https link), pick the date and time on the clock, the duration and time zone (India by default), and add interviewers and notes for the candidate. TinQa emails the candidate the details with a calendar invite, and again when it is rescheduled or cancelled. Record each interview\'s outcome (passed, failed or no-show) with a 1–5 rating and feedback.',
      'Approvals Hub › Careers (Level 2): shortlists and selections waiting for you, oldest first, with who asked, their note and the résumé match. Approve or Return (with a note) here, or open the application.',
    ],
  },
  {
    date: '2026-10-29',
    changes: [
      'Client demos › Quotation: one event can now start at the very minute the one before it ends. If Travel 1 arrives at 4:00 pm, Travel 2 can depart at 4:00 pm (not 4:01 pm); the same holds for a visit, journey or stay that starts when another ends. Only times before that are greyed out.',
      'Client demos: every time (a visit\'s From and To, a journey\'s departure and arrival, a night\'s check-in and check-out, also when adding a bill on the demo) is now picked on a round clock: choose am or pm and the hour, then the exact minute (e.g. 9:47 am).',
      'Client demos: the same time can\'t be used twice. Time already taken that day by a client visit or a journey is shaded grey on the clock, listed under it, and can\'t be picked for another visit or journey; an end time that would run into it can\'t be picked either. A night stay can\'t overlap another night stay, but the staff may visit clients and travel during a stay. A plan saved earlier with clashing times shows which item it clashes with.',
      'Client demos › Visit & staff: every product unit taken to a demo is now picked by its barcode, for accountability. Scan or type a unit\'s barcode (its product is added with it), or choose a product and tick its units in stock; the number of units is the number of barcodes. A unit another demo has on overlapping days can\'t be picked. Products listed before this keep their number of units until their units are picked.',
      'Client demos › the demo › Units taken: on the demo\'s days the attending staff (or the demo manager) scan the units as they leave and press Hand out: they are out of stock, and the storefront\'s stock goes down at once, so they can\'t be sold meanwhile (units already ordered online can\'t go). After the demo, scan them back and press Hand back: they are in stock again. A demo can\'t be sent for completion or cancelled while a unit is out; a unit that did not come back is written off by a Super Admin (Level 2) with the reason.',
      'Resubmitting a rejected product no longer asks for every barcode again: the unit and piece barcodes sent last time (when it was created, its stock changed or it was last resubmitted) are filled in. Check them, change only those that differ and scan any still missing, such as pieces of a component added after the rejection. They are kept in the browser they were entered in; on another computer they are scanned again.',
      'Creating a quotation (Orders Management › Create Order, and New quotation in the dealer portal): after choosing the item, its existing price (MRP) is shown and can\'t be edited. To quote a different price, enter it as the new quoted price; the form shows the difference (e.g. ₹1,499 → ₹1,699 is +₹200) and then needs the reason for it, which the approver sees in the Approvals Hub. Leave the new price empty to quote the existing price; the reason box stays locked until a new price is entered.',
      'Client demos › Clients: every client now has its own phone (required) and email (optional), such as a hotel\'s front desk, besides its contact person\'s. The same contact person may help at several clients.',
      'Client demos › Clients: where the client is now sits with its name, phone and email (address, PIN code, city, state and Google Maps location), with the contact person below. The PIN code is required and fills in the city and state; they are typed in by hand only when the PIN code service can\'t be reached. Changing the PIN code replaces them.',
      'The same client can\'t be visited twice in a row on one day. Clients are matched by their own phone (however it is written: +91…, 0… or the 10 digits) or email. To see a hotel from 10:00 am to 12:00 pm and again from 1:00 pm to 3:00 pm, make it one visit from 10:00 am to 3:00 pm, or visit another client in between.',
      'Client demos › Clients: Add client now starts the new client when the day\'s last visit ends (if Client 1 is 10:00 am to 1:00 pm, Client 2 starts at 1:00 pm, for three hours). If that day has no time left, it starts at 10:00 am the next day. Change the times as needed.',
      'Client demos: a journey\'s departure and arrival, and a night\'s check-in and check-out, are now one range field (in the quotation and when adding a bill on the demo). It shows both ends and how long it lasts (e.g. Fri, 10 May · 6:00 pm → Sat, 11 May · 6:00 am, 12 h). Click it to pick the start\'s day from the row of days and its time on the clock; it then moves to the end, whose day follows the start\'s (pick +1 day to arrive or check out the next day). Time already taken stays greyed out.',
      'Quotation › Day by day: journeys, the night stay and meals can be put in any order on their day. Drag a card by its handle (⋮⋮ next to its name), or focus the handle and press ↑ ↓, e.g. to make Travel 2 into Travel 1. Journeys run in the order shown, each departing when the one above arrives or later; if moving one breaks that, Next says which to fix.',
      'The clock\'s minute face now shows only 00, 05 … 55. For an exact minute, point anywhere around the face: the hand follows the pointer and the minute it will pick (e.g. 9:47 am, or "taken") shows in the middle; click to pick it.',
      'Quotation › Day by day: each day now has Travel, and you can add as many journeys as needed (e.g. Delhi → Manali, then Manali → Mall Road), each with how, from, to, its departure and arrival date and time, and its expected amount. A journey can arrive the next day (6:00 pm on 30 Oct to 6:00 am on 31 Oct).',
      'Quotation › Day by day: adding another journey keeps the journeys already filled in, in the order they were added. Journeys run one after another: each departs when the one before arrives or later (if Travel 1 arrives at 12:00 pm, Travel 2 departs at 12:00 pm or later), and a journey after an overnight one starts on the date it arrived.',
      'Times in client demos are now picked, never typed: a client visit\'s From and To, and a journey\'s or night stay\'s departure / check-in and arrival / check-out. Times that would go backwards (an arrival before its departure, a visit ending before it starts, a journey before the last one arrives) are greyed out. Moving a start past its end clears the end time, to pick again.',
      'A night stay\'s check-in and check-out now each have a date as well as a time, as check-out is usually the next day. Bills added on the demo page take the same dates.',
      'Quotation › Proposed budget: the day-by-day total is worked out from the travel, stays and meals. Add an optional extra budget on top; any extra needs the reason and its breakup (e.g. snow chains ₹1,200, local guide ₹800). The total proposed budget is the two together, and the approver sees the extra and why.',
    ],
  },
  {
    date: '2026-10-28',
    changes: [
      'Client demos visit several clients on one trip: add as many clients as needed (e.g. three hotels over two days), each with its own day and expected time, such as 10:00 am to 1:00 pm. Visits on the same day can\'t overlap. Hotels, home stays, corporate offices, hospitals, clinics and restaurants can also carry their legal name and GSTIN (optional). The trip\'s start date and number of days are now on the first step.',
      'Visit & staff: choose the products to demo, one or more, with how many units of each are taken.',
      'The quotation is planned day by day: Day 1, Day 2 … each with an optional night stay, breakfast, lunch, snacks and dinner and their expected amounts. A night\'s hotel is picked from the trip\'s hotel clients (its address, location, GSTIN and phone are filled in), or copied from another night, or typed in as another hotel; the check-in and check-out times are given too (e.g. 9:00 pm to 6:00 am). An invoice can be attached now but isn\'t needed: the travelling staff add invoices on the demo later. Changing the demo opens the same day-by-day quotation again, saved in one go.',
      'The Approvals Hub opens faster: the number on each tab is now counted by the server in one go, and a tab loads its list only when you open it (opening a tab always shows its latest list). The numbers refresh whenever you switch tabs or make a decision.',
      'Client Demos & Meetings (new menu, Super Admins and Finance Managers): schedule a demo appointment or a promotion at a client (hotel, home stay, corporate office, hospital, clinic, home visit, shopping mall, restaurant, public place or other) step by step: the client with contact details and Google Maps location, the date, time, number of days and attending staff, then the quotation (proposed budget and an optional schedule of stay: which hotel each day, its address, location and GSTIN).',
      'The quotation is approved by a different Level 2 approver before the visit (Approvals Hub › Client demos). Once approved, every change to the plan needs a reason, and a new budget or number of days sends the quotation back for approval.',
      'While the visit runs, record each day\'s stay (hotel, location, GSTIN, invoice), food (breakfast, lunch, snacks or dinner, restaurant, invoice), travel (from, to, how, ticket) and any other cost with the reason it was needed, each with its invoice or ticket as a PDF or photo. The demo works out the total against the budget. Changing or removing a recorded bill needs a reason; everything is kept on the demo\'s timeline.',
      'After the visit, send it for completion with the outcome. A different Level 2 approves it, and only then is the total spent booked in Accounts & Finance as Travel & conveyance.',
      'A completed demo is changed only by a Super Admin (Level 2): "Reopen for correction" with a reason, correct it, and send it for approval again. When approved, only the difference to what was booked is booked.',
      'My Demos (new menu, every employee): the demos you are tagged on as attending staff. Record your own hotel, food and travel bills on an approved demo while it runs.',
    ],
  },
  {
    date: '2026-10-28',
    changes: [
      'Correct barcode / Assign barcodes are now offered only to Store Managers, Fulfillment Specialists and Super Admins. Everyone else can still trace barcodes but no longer sees these options. Every correction still waits for a Level 2 Super Admin\'s approval in Approvals Hub › Barcodes.',
      'Product drafts: a product takes a lot of details, so the product form now has "Save as draft". A draft needs only a title and a category; everything else can be added later. A draft holds no stock, takes nothing from item stock and is not sent for approval. It is marked Draft in Products Management: open it (pencil-and-page icon) to carry on, add or change its components freely, save it again, or "Submit for approval" — which checks every field and asks for the first unit\'s barcodes, as a new product does.',
      'Unsold products: a switched-off product with 1 unit in stock can now have its components changed. The same save rebuilds the unit (its old pieces go back to item stock; scan the rebuilt unit\'s barcode and its pieces). A rejected product already returned its pieces, so its components change freely and the unit is scanned again on resubmission. A product on sale must be switched off first; with more than 1 unit, reduce the stock to 1 first.',
      'Sold products keep their components: once a product is on any customer order, its components can\'t change any more (past orders, warranties and costs depend on them), whether it is on or off. The form says so and offers "Create Version 2": a draft copy of the product with its components, warranties, specifications and costs, whose components you can change and send for approval. The old version keeps selling until the new one is approved and turned on; then the old one is turned off automatically. Products Management shows each product\'s version (v1, v2…) and marks sold products.',
      'Item SKUs are now generated automatically when an item is created, as TQ-year month day-number of the item that day, e.g. TQ-20261028-0001 for the first item created on 28 Oct 2026. Every SKU is unique, and it can\'t be typed in or changed. Items created earlier keep the SKUs they have.',
      'Approvals Hub › Requests now lists every quotation and order waiting on someone: quotations dealers send in (submit them for approval or cancel them, with a reason), orders to approve, and return requests to approve or reject. Each one opens with its details and the decisions it allows.',
    ],
  },
  {
    date: '2026-10-27',
    changes: [
      'Barcodes: every piece the company owns now carries its own barcode, and so does every unit of every product. Barcodes are 8-32 letters, digits or hyphens (EAN, UPC and Code 128 labels all fit); scan them or type them, one by one or pasted together.',
      'Receiving stock: scan one barcode for each unit that passed testing (defected units go back to the dealer and get none). A stock entry can\'t be saved until every passed unit has its barcode, and each barcode can be used only once.',
      'Creating a product, adding product stock and resubmitting a rejected product: scan each new unit\'s barcode and, for every component, the barcode of each piece fitted into it ("Pick from stock" fills in pieces in stock, oldest first). Reducing product stock names the units taken out; their pieces go back to item stock.',
      'Barcodes are locked once what they belong to is approved: a stock entry by its Level 2 approver, a product when it is approved. After that only a Super Admin (Level 2) can change one. Everyone else uses "Correct barcode" on the barcode\'s page, and a Super Admin approves or rejects it in Approvals Hub › Barcodes. Stock received before barcodes existed gets its barcodes the same way ("Assign barcodes" on the stock entry).',
      'Barcode Tracking (new menu): scan any barcode to see what it is. For a component piece: its item, batch, purchase order, dealer, delivery date, who received and approved it, and the product unit it is fitted into. For a product unit: every part inside it with where each came from. Every change to a barcode is listed in its history.',
      'Stock and product details, and the approvals of stock entries and new products, list the barcodes involved.',
      'A product\'s components can\'t change while units are in stock, because each unit\'s pieces are recorded by barcode: reduce the stock to 0 first (the pieces go back to item stock), change the components, then add stock again. Unit costs can still be edited. Product stock is now always changed with Add / Reduce stock.',
    ],
  },
  {
    date: '2026-10-23',
    changes: [
      'Product order: in Products Management, drag a product by its handle (⋮⋮) to the position it should have on the storefront, e.g. from fifth to first. The # column shows each product\'s position, the order is saved as soon as you drop it, and the arrow keys ↑ ↓ on the handle move a product one place.',
      'Choose a category first to arrange only that category: its products swap places among themselves and other categories don\'t move. With All Categories you set the order of the whole catalog. Clear the search before dragging.',
      'New products appear last until moved. Ordering is done by whoever can publish products (Super Admins, Store Managers, Catalog Specialists); it is not part of the product form and needs no approval.',
    ],
  },
  {
    date: '2026-10-23',
    changes: [
      'Product categories: every product now has a category (Dioramas, Accessories, Spare parts...). In the product form, pick one from the Category box or type a new name and choose "Create category" — it is created when the product is saved. There is no fixed list.',
      'A name that matches an existing category, ignoring capitals, spaces and punctuation ("accessories", "Accessories "), always picks that category, so the same category is never created twice.',
      'Existing products were placed in Dioramas, and accessories in Accessories. Changing a product\'s category is an edit like any other: on an approved product it goes for approval, and the approver sees the old and new category.',
      'Products Management shows each product\'s category and filters the list by category.',
      'Storefront: the Dioramas page is now Products. Its bar lists the categories with how many products each has; choosing one jumps to that category and shows all its products. A link such as /products?category=accessories opens the page at that category.',
    ],
  },
  {
    date: '2026-10-22',
    changes: [
      'Customer Management (new menu): search storefront customers by name, email or phone, or list those who left items in their cart. A customer\'s page shows their profile and addresses, every order with what they bought and when, their cart, their support tickets and an activity timeline, with email and call links to contact them.',
      'Customer details (name, phone, date of birth) are changed only by the Super Admin (Level 2), with a reason. Customer Support and Store Managers use "Request change": the Super Admin is notified with the requested values and a link to the customer, and makes the change after checking it.',
      'Product costing: the product form has a "Costing & profit" section. Each component\'s unit cost is filled from its purchase price (what the next unit taken from stock cost, including its share of freight) and can be adjusted; add every other cost of one unit — manpower, software, packaging — with how you worked it out.',
      'The form shows live what one unit earns: selling price, GST taken out, net revenue, cost, profit before tax, margin, income tax and profit after tax (PAT). The approver sees the cost and profit with the request.',
      'Product details show the cost sheet and the profit made so far on delivered orders. Customer order details show the order\'s profit: each line at its cost when ordered, shipping charged and shipping paid.',
      'Accounts & Finance › Product profit lists the profit of every product on delivered orders in a period. Costs are seen by Super Admins, Store Managers, Catalog Specialists, Financial Auditors and Finance Managers, and entered by the first three; customers never see them.',
      'Analytics is no longer listed in the role menus; it is hidden from the sidebar for now.',
      'Salaries: each month the Finance Manager records salary transfers in Payments & Chalans (one employee, or everyone unpaid at once, with bonuses or deductions); a different Level 2 confirms them. Confirmed salaries are booked in Accounts & Finance and each payslip is emailed.',
      'My Payslips: every employee sees and downloads their own payslips once the month\'s salary is confirmed.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Accessories: in the product form, tick "This product is also an accessory" and choose the products it is offered with. It still sells on its own at its own price and discount.',
      'Each of those products gets its own extra discount (0–90 %). When a customer buys the accessory together with that product, one accessory per unit of the product gets the extra percent off its already-discounted price; any more accessory units are charged the normal price.',
      'Add "Why customers need it" and up to 10 benefits. The storefront shows them with the accessory\'s warranties and what\'s included next to each product, in the bag and at checkout.',
      'A product that has accessories can\'t become an accessory itself, and an accessory can\'t have accessories. Accessory changes on an approved product go for approval like any other edit; the approver sees the products and discounts.',
      'Orders, invoices and store-sale totals show the bundle discount on the accessory line.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Company Profile is split into tabs, one per section: Brand, Legal & address, Contact, Home page video, Sign-in pages, Shipping charges and Invoice terms. Each tab shows that section as it is live, its change waiting for approval and your drafts for it.',
      'Propose a change in a tab drafts only that section, and the editor shows only its fields. Approving it puts just that section live; every other section stays as it is, including changes approved after the draft was made.',
      'One change per section can wait for approval, so a pending Brand change no longer blocks submitting, say, Shipping charges. The Approvals Hub lists each pending change with its section.',
      'GSTIN, PAN and the registered address are one section (Legal & address) because the state code must match the GSTIN.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Sign-in pages: this admin portal and the storefront now share one layout: the sign-in form on one half and, on the other, a background image covering the whole half with a headline, an optional tagline and up to 4 highlight points over it.',
      'Company Profile › Sign-in pages: upload the image (JPG, PNG or WEBP, up to 5 MB; used by both portals) and write each portal\'s own headline, tagline and points, with a preview of each. Like the logo and home page video, it goes live only after another Level 2 approves the version. Without an image the blue background is shown.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Verified emails: before a customer or an employee is registered, their email is proved with a 5-digit code sent to it. The Store Sales Agent (customer\'s email) or the Super Admin (new employee\'s personal email, now required) presses Send code, types the code the person reads out and presses Verify; registering is possible only after that. A code works for 10 minutes; a new one can be asked for after a minute.',
      'No temporary passwords: a new employee is emailed a link to choose their password at their personal email once the account is approved (or at once when no approval is needed), and a customer registered at a store gets a "Set my password" link in their welcome email. Links work once, for 15 minutes.',
      'Forgot password: staff and dealers use "Forgot password?" on the sign-in page with their username or email, customers on the storefront sign-in page with their email. A link to choose a new password is emailed (employees: to the personal email); it works once, for 15 minutes, and signs out every other session.',
      'Customers are emailed when their order is confirmed, shipped, out for delivery and delivered; the delivered email carries the GST tax invoice as a PDF.',
      'Store Sales shows the customer\'s email (verified or not), mobile, whether they have set their password yet and, on every sale, the delivery address.',
    ],
  },
  {
    date: '2026-10-21',
    changes: [
      'Store sales: a new Store Sales Agent designation sells at a store or in the market. In Store Sales the agent finds the customer by mobile number or email, or registers them (the same details as the storefront sign-up, and a delivery address; no password), adds products, gets the total from the server and books the order. Each sale is credited to the agent who booked it.',
      'Cash the agent received counts at once: the order is marked paid and confirmed and the sale, shipping and GST are booked to the company account, naming the agent. There is no separate cash approval. Fulfilment then continues as for any order. An online store sale is paid by the customer from their account.',
      'After a store sale the customer is emailed a welcome or order email with the website link, their user ID, the order summary, how to sign in and track the order, and the payment receipt as a PDF (the GST tax invoice is still issued when the order ships). Store Sales shows whether each email was sent.',
      'Company Profile › Email (Level 2 Super Admin): the mail server, sender address and name, and reply-to address of customer emails, with a test email. The password is stored encrypted and never shown again. Emails carry the live profile\'s brand name, logo, website and support details.',
      'Customer orders show where they were sold and by whom. Customers can\'t cancel or return a cash store order online: the store or customer support does it. Store and Finance Managers and Financial Auditors see every agent\'s sales (Store Sales › All store sales).',
    ],
  },
  {
    date: '2026-10-20',
    changes: [
      'GST in one place: Accounts & Finance › GST shows the GST charged to customers (output tax), the GST paid to dealers and on bills (input tax, and how much is claimable as input tax credit), the set-off month by month, what is payable in cash with each GSTR-3B, what was paid to the government and what is outstanding till date. The GST register below it lists every invoice, credit note, dealer purchase and bill line with its order, document number, party, GSTIN and CGST/SGST/IGST/cess, and exports to CSV, PDF, Excel or Word.',
      'A refund on an invoiced customer order now issues a credit note (e.g. TQC/26-27/000001) that takes its share of the invoice\'s GST off output tax; the customer sees it on their order.',
      'Finance waits for Admin Level 2: a dealer purchase is booked only when a Level 2 approves the stock entry (not when it is recorded), with the quotation\'s GST as input tax. A change to an approved stock entry (units added or counts corrected) also waits for Level 2: the money stays at the approved value and added units are held back from use until it is approved; rejecting puts the approved counts back.',
      'GST in a customer payment is held for the government, not counted as sales; expense bills claim their GST as input tax credit unless marked as blocked credit. GST paid to the government is raised as a "GST paid to the government (challan)" voucher.',
      'Dealers sign in to this web app: Dealer Managers create their logins, a different Level 2 approves them.',
      "Dealers' quotation changes wait for a Dealer Manager of either level; the quotation is frozen meanwhile.",
      'Quotation, purchase order and bill can be printed from an order.',
      'Pre-orders are approved from the Approvals Hub (Pre-orders tab) once stock is there and the order is paid.',
      'Customer orders are confirmed only when fully paid; payment attempts show on the order.',
      'Expenses and vouchers: attach the bill to fill the form, GST is split CGST/SGST or IGST from the GSTINs.',
      'Item and product warranties; edits to an approved product wait for approval while the live one stays unchanged.',
      'Delivery riders record door-step outcomes only; Fleet Coordinators also send parcels back to the warehouse.',
      'User Guide in the sidebar for Super Admin and Store Manager, with per-role PDF downloads.',
      'Item and Dealer lists: search and every filter (category, unit, city, status) cover the whole list, with pages; employee search matches full names.',
      'Search boxes on server lists (items, dealers, employees, order tracking, ledger, vouchers) search 2 seconds after you stop typing, or at once on Enter.',
      'Product GST, as the law requires: every product has an HSN/SAC and one GST rate (0, 0.25, 1.5, 3, 5, 18 or 40%), and its price includes GST. Each order charges CGST + SGST (half the rate each) when delivered in our state and IGST to other states; delivery charges are taxed at the goods\' rate.',
      'Customer tax invoices are issued when the order ships, numbered consecutively per financial year (e.g. TQ/26-27/000001), and print the exact GST split with the place of supply.',
      'Dealers mark their confirmed orders as shipped from My Orders; the procurement team is notified and records the delivery.',
      'Fulfillment & Warehouse sees every delivered purchase order that has no stock entry yet when adding stock, without needing access to procurement orders.',
      'Dealer purchases reach the company account when stock is recorded, not on delivery: only units that passed testing are paid for (unit price × passed units + shipment). Correcting or adding passed units books the difference; a rejected stock entry books nothing.',
      'Quotations can carry an optional GST breakup: CGST + SGST (dealer in our state) or IGST (another state) at one of the rates in force, with HSN/SAC and cess. Prices are before GST; the GST follows any later change to quantity, price or shipment, and dealers change it through the usual change request.',
      "Marking a procurement order delivered needs the dealer's invoice PDF. It is read and checked against the quotation (total, taxable value, CGST/SGST/IGST, cess and the dealer's GSTIN). A matching invoice lets the order be delivered; one that doesn't match, or a scanned PDF that can't be read, needs a Level 2 order approver to accept it with a reason, which is kept in the order's history.",
    ],
  },
  {
    date: '2026-10-15',
    changes: ['Access is set by designation and level (Level 1 maker, Level 2 approver) instead of hand-picked roles.'],
  },
];

const ROLE_LIST: RoleGuide[] = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    summary: 'Runs the whole portal: staff accounts, access, settings and every approval.',
    menu: ['finance', 'approvals', 'orders', 'store-sales', 'order-tracking', 'customers', 'promo-codes', 'support-tickets', 'reviews',
      'employees', 'items', 'barcodes', 'products', 'dealers', 'payments', 'client-demos', 'client-outreach', 'careers', 'my-demos', 'my-meetings', 'my-payslips', 'company-profile',
      'user-guide'],
    hasApprovalLevel: true,
    does: [
      'Create employees with a designation and level, edit them, and request their removal',
      'See what every designation holds (Employee Management › Roles & permissions) and change an employee\'s access',
      'Create custom roles such as Marketing Executive (Employee Management › Roles & permissions › New role): a name, department, description and the permission groups it carries, from the groups you hold yourself; see how many employees hold each role, edit or deactivate a custom role, and delete one nobody holds. Built-in roles cannot be changed',
      'Log calls, emails, WhatsApp messages and visits with the businesses we pitch to (Client Outreach): add a business (one already on file by phone or email opens instead), log each contact with how it went, their interest and the next step with its follow-up date, attach screenshots or PDFs as proof, edit your own contacts, and work through My follow-ups; the summary shows contacts per day and per executive for any period',
      'Everything every other staff role can do',
      'Open the User Guide and download a role\'s PDF to hand to a colleague',
      'Set up the mail server and sender of customer emails, and send a test (Company Profile › Email, Level 2)',
      'Record monthly salary transfers (Payments & Chalans), like a Finance Manager',
      'Correct a customer\'s name, phone or date of birth (Customer Management › Edit details, Level 2), including changes customer care asked for',
      'Correct a locked barcode directly (Barcode Tracking › Correct barcode, Level 2); the change is kept in the barcode\'s history',
      'Schedule client demos and meetings and record their bills, like a Finance Manager (Client Demos & Meetings)',
      'Reopen a completed client demo for correction, with a reason (Level 2): only a Super Admin changes a completed demo, and the correction is approved again',
      'Write off a product unit that did not come back from a client demo, with the reason (Level 2): it leaves stock for good',
      'Post job openings and screen applicants, schedule interviews and record their outcomes (Careers)',
      'Create promo codes for every customer or chosen ones, on every product or chosen ones (each with its own units: all or a number), with the discount (a percentage, or an amount of at most ₹1,000 off each unit), uses and dates; edit everything but the code, switch them off or back on, delete and restore them (Promo Codes, Level 2). You are the only one who sees the codes of chosen customers in full',
      'Email a code to its chosen customers, or show a code for every customer on the storefront (Promo Codes › the code)',
    ],
    approves: [
      'New employee accounts, employee deletions and profile changes',
      'Products, stock entries, procurement orders and returns, dealer logins and dealer quotation changes',
      'Refunds, expenses, company profile changes and documents',
      'Salary transfers recorded by someone else (never your own salary)',
      'Barcode corrections, and barcodes for stock received before barcodes were recorded (Approvals Hub › Barcodes): only a Level 2 Super Admin changes a locked barcode',
      'Delete anyone\'s company profile draft',
      'Client demo quotations, completions and corrections (Approvals Hub › Client demos), except demos you planned, sent or attend',
      'Careers shortlists and selections (Approvals Hub › Careers), except those you asked for',
    ],
    tips: [
      'You never approve your own request: a second Super Admin (Level 2) decides on what you prepare.',
      'Access is never granted one button at a time. Change the designation or level instead.',
      'A custom role in use cannot be deleted: deactivate it instead. Its employees keep it; nobody new gets it. Changes to a role\'s groups apply when its employees next sign in.',
    ],
  },
  {
    id: 'STORE_MANAGER',
    name: 'Store Manager',
    summary: 'Owns the online store: catalog, stock, customer orders, refunds, support, reviews and the company profile.',
    menu: ['finance', 'approvals', 'store-sales', 'order-tracking', 'customers', 'promo-codes', 'support-tickets', 'reviews', 'items',
      'barcodes', 'products', 'payments', 'client-demos', 'client-outreach', 'careers', 'my-demos', 'my-meetings', 'my-payslips', 'company-profile', 'user-guide'],
    hasApprovalLevel: true,
    does: [
      'Create and edit items (with warranties) and products, submit them for approval and publish approved ones',
      'Save unfinished products as drafts, and create a new version of a sold product to change its components',
      'Give every product its own model name, and adapt a new version (v0.2, v0.3…) from any earlier one by picking it in the title',
      'Set the order products appear in on the storefront by dragging them in Products Management',
      'Enter each product\'s costs (component costs, manpower, software…) and see its profit before and after tax, per unit and on delivered orders',
      'Move customer orders forward, update tracking and accept pre-orders once stock is there',
      'Book store sales for walk-in customers, like a Store Sales Agent, and follow every agent\'s sales',
      'Request refunds, reply to support tickets, publish or hide reviews',
      'Look up customers with their orders, carts and tickets, and ask the Super Admin to correct their details',
      'Look up promo codes to tell a customer which one to use: who and which products each is for, its limits and dates, and the orders that used it (Promo Codes). A code for chosen customers shows only as TINQA***: email it to them with "Email code"; show a code for every customer on the storefront with "Show on storefront"',
      'Trace any piece or product unit by its barcode (Barcode Tracking) and ask a Super Admin to correct a barcode',
      'Draft company profile changes, upload documents, raise expenses',
      'Post job openings, screen applicants, schedule interviews and record their outcomes (Careers)',
      'Log calls, emails, WhatsApp messages and visits with the businesses we pitch to (Client Outreach): add a business (one already on file by phone or email opens instead), log each contact with how it went, their interest and the next step with its follow-up date, attach screenshots or PDFs as proof, edit your own contacts, and work through My follow-ups; the summary shows contacts per day and per executive for any period',
      'Open the User Guide and download a role\'s PDF to hand to a colleague',
    ],
    approves: ['Products and their changes before they go live, seeing each one\'s cost, margin and profit after tax (approving a new product locks its unit barcodes)', 'Stock entries (approving locks the barcode of each passed unit)', 'Refunds', 'Company profile changes', 'Careers shortlists and selections (Approvals Hub › Careers), except those you asked for'],
    tips: [
      'Pre-orders can be accepted at Level 1 too: Approvals Hub › Pre-orders.',
      'Dealers and procurement orders belong to the Dealer Manager; they are not in your menu.',
    ],
  },
  {
    id: 'DEALER_MANAGER',
    name: 'Dealer Manager',
    summary: 'Buys from suppliers: dealers, their web logins, quotations and procurement orders.',
    menu: ['finance', 'approvals', 'orders', 'items', 'barcodes', 'products', 'dealers', 'payments', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: true,
    does: [
      'Onboard, edit, activate or deactivate dealers and assign them item categories',
      'Create a dealer\'s web login, switch it off or reset its password',
      'Create quotation requests (RFQs) at the item\'s existing price, or at a new quoted price with the reason for it, edit quotations and submit them for approval',
      'Review quotations dealers send in and submit them for approval or cancel them, from Approvals Hub › Requests (Level 1 too)',
      'Move orders forward: shipped, delivered, returns and refunds',
      'Add the GST breakup to a quotation (optional): CGST + SGST or IGST, rate, HSN/SAC, cess',
      'Give every quotation its payment plan: the advance and an optional midterm percentage (30% and 30% to start with; both editable, untick the midterm for advance and final only), the final part worked out as the rest of 100% and paid only after testing, and how the dealer expects to be paid (cash, online, bank transfer or cheque)',
      'Record what was actually paid to the dealer against each part of the plan (any amount, e.g. 25% or 50% instead of the planned 30%), with the method, date and reference, and the refunds the dealer pays back; correct or withdraw your own entry until it is confirmed, and reverse a confirmed one (Orders Management › the order › Payments to the dealer)',
      "Upload the dealer's invoice PDF when marking an order delivered; it is checked against the quotation",
      'Print the quotation, purchase order and bill of an order',
      'Approve or reject dealers\' changes to their quotations (Level 1 too)',
      'View the catalog and stock, upload documents, raise expenses',
      'Trace a piece by its barcode back to its purchase order, batch and dealer (Barcode Tracking)',
    ],
    approves: [
      'Procurement orders (approve or reject) and the dealer\'s confirmation',
      "Accepting a dealer's invoice that doesn't match the quotation, or couldn't be read, with a reason",
      'Return requests',
      'Dealer logins created by someone else',
      'Removing a dealer',
      'Payments to dealers and refunds from them recorded by someone else (Approvals Hub › Dealer payments), and changing the amount of a refund claim with a reason',
    ],
    tips: [
      'While a dealer\'s change request is open the quotation is frozen for everyone until it is decided. It shows in Approvals Hub › Dealers, and in Requests again once the change is decided.',
      'To adjust a dealer\'s quotation before submitting it, edit it in Orders Management; the Approvals Hub submits it as it is.',
      'Deactivating a dealer also switches off their login.',
      "An invoice that doesn't match is shown figure by figure: ask the dealer for a corrected invoice before accepting one by override.",
      'A payment counts only once someone else confirms it. Until the delivered units are tested only the advance and midterm parts can be paid; after testing the order is worth only the units that passed, and if more was paid a refund claim against the dealer opens by itself.',
    ],
  },
  {
    id: 'CATALOG_SPECIALIST',
    name: 'Catalog Specialist',
    summary: 'Builds and maintains the product catalog.',
    menu: ['finance', 'items', 'barcodes', 'products', 'careers', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Create, edit and delete items and item categories, including their warranties. Each new item gets its SKU automatically (TQ-yyyyMMdd-0001, numbered per day); it can\'t be changed',
      'Create products from items, with components and warranties, scanning the new unit\'s barcode and the barcode of every component piece fitted into it',
      'Add or reduce product stock: each added unit gets its barcode and its pieces\' barcodes; units taken out are named by barcode',
      'Give each product a category: pick an existing one or type a new name to create it',
      'Enter what one unit costs: each component\'s unit cost (filled from its purchase price) and extra costs such as manpower or software, each with how it was worked out',
      'Check what the product earns before saving: net revenue, cost, profit, margin and profit after tax; later, its profit on delivered orders (product details, Accounts & Finance › Product profit)',
      'Set each product\'s HSN/SAC and GST rate; the price you enter is what the customer pays, GST included',
      'Mark a product as an accessory of other products, with an extra discount when bought together',
      'Submit products for approval and publish approved ones to the storefront',
      'Save an unfinished product as a draft (only title and category needed) and finish it later',
      'Create a new version of a sold product to change its components',
      'Give every product its own model name, and adapt a new version (v0.2, v0.3…) from any earlier one by picking it in the title',
      'Set the order products appear in on the storefront by dragging them in Products Management, for the whole catalog or one category',
      'Add the five standard product images (front, side, back, close-up, in use), each with a description of what it shows; type only the image folder, and each image is found there by its name from the product name and version (rudrax_v0.1_1.png)',
      'Write each description in the template (Overview, The Story, Technology, Craftsmanship, Perfect For, Highlights), starting from one of three suggested versions if you like',
      'View stock, upload documents',
      'Post job openings, screen applicants, schedule interviews and record their outcomes (Careers); a Level 2 Super Admin or Store Manager confirms each shortlist and selection',
    ],
    approves: [],
    tips: [
      'Editing a product that is already approved sends the change for approval; the live product stays as it is until then.',
      'To put a product first in its category, choose that category in Products Management and drag the product to the top. Without a category chosen, you move it in the whole catalog.',
      'Before creating a category, type a few letters and look at the suggestions: reuse "Accessories" rather than creating "Accessory". The storefront lists products under their category, so a clear, plural name reads best.',
      'Enter the GST-inclusive price (e.g. ₹59,999). The form shows the split for delivery in our state (CGST + SGST) and to other states (IGST); both add up to exactly that price. Orders keep the GST they were placed with even if the rate changes later.',
      'Products created before GST was recorded need their HSN/SAC and rate added the next time they are edited.',
      'Accessory extra discounts stack on the accessory\'s own discount: ₹1,000 at 10 % off is ₹900; with 5 % extra next to its product it is ₹855. Use 0 % to show it with a product without an extra discount.',
      'Costs exclude GST (GST paid on purchases comes back as input tax credit). Write the reason with each extra cost, e.g. "2 technicians × 4 hours × ₹250/hour", so the approver and finance can check it.',
      'A component left without a cost is flagged: the profit shown is then too high. Shipping is not part of the product\'s cost; it is added to each order when it ships.',
      'Changing the components of a product that has not been sold: switch it off first. With 1 unit in stock, the same save rebuilds that unit — its old pieces go back to item stock and you scan the rebuilt unit\'s barcodes. A rejected product already gave its pieces back, so its components change freely; when you resubmit, the barcodes entered last time are filled in and only the new components\' pieces are scanned. With more units, reduce the stock to 1 (or 0) first.',
      'Not sure of every detail yet? Save the product as a draft. Its components can change as often as you like until you submit it; its first unit is built (and its barcodes scanned) only when you submit.',
      'Once a product has been sold, its components are locked for good. Use "Create new version" (in the product form or the list): give the copy its own model name, change it, submit it, and once it is approved and turned on the old version is switched off by itself. Orders already placed keep pointing at the version they bought.',
      'Making v0.2 of a product? Don\'t start from scratch: type its title in Create Product and pick the version to adapt from (any version, not only the newest). Everything is copied; change only what differs and give it a new model name. Each version keeps its own model name for good, so pick one that tells the versions apart, e.g. RX-100, RX-200.',
      'Photograph every product the same way, slot by slot: a plain background for the front, side and back views, then one close-up of the finest detail and one picture in use. Describe what a shopper should notice in each picture, not what it is called ("The brass bell hangs from a hand-carved beam" rather than "Back view"): Aura reads it out while the picture is on the big screen.',
      'Describing a product: press "Suggest descriptions" and name what the miniature shows as Wikipedia would ("Kedarnath Temple" rather than a model name like "RudraX"). Pick the closest of the three versions, then make it yours: keep facts you can check, and list in Technology and Highlights only what this product really has. Aura compares products by their Overview, Perfect For and Highlights, so keep those short and specific.',
      'A wrong barcode can\'t be fixed once approved: tell your Store Manager or the warehouse (Fulfillment); they ask for the correction in Barcode Tracking and a Super Admin decides.',
    ],
  },
  {
    id: 'FULFILLMENT_SPECIALIST',
    name: 'Fulfillment & Warehouse',
    summary: 'Receives stock and picks, packs and ships customer orders.',
    menu: ['finance', 'approvals', 'order-tracking', 'items', 'barcodes', 'products', 'client-demos', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Receive any delivered purchase order into stock, scanning one barcode for each unit that passed testing, correct an entry\'s quantities, set storefront stock',
      'Trace any piece by its barcode, and ask a Super Admin to correct a wrong one or to label stock received before barcodes (Assign barcodes)',
      'Confirm paid orders, then move them through processing, packed and shipped',
      'Accept pre-orders once stock is there (Approvals Hub › Pre-orders)',
      'Update shipment tracking, raise expenses (e.g. shipping costs)',
    ],
    approves: [],
    tips: [
      'Stock you record counts only after a Level 2 Store Manager approves it; that also locks its barcodes.',
      'Scan the label on each piece as you count it: the form takes a scanner\'s codes one after another, or a pasted list.',
    ],
  },
  {
    id: 'DELIVERY_RIDER',
    name: 'Delivery Rider',
    summary: 'Delivers orders to the customer\'s door.',
    menu: ['order-tracking', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'See customer orders and their shipping address',
      'Record what happened at the door: out for delivery, delivered, customer unavailable, invalid address, customer cancelled delivery, re-attempt',
    ],
    approves: [],
    tips: ['Other statuses (packing, sending a parcel back to the warehouse) belong to fulfilment staff and the Fleet Coordinator.'],
  },
  {
    id: 'FLEET_COORDINATOR',
    name: 'Fleet Coordinator',
    summary: 'The riders\' senior: plans deliveries and keeps tracking up to date.',
    menu: ['finance', 'order-tracking', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Record the same door-step outcomes as a rider',
      'Update shipment tracking and send refused or undeliverable parcels back to the warehouse',
      'Raise expenses',
    ],
    approves: [],
    tips: [],
  },
  {
    id: 'CUSTOMER_SUPPORT',
    name: 'Customer Support',
    summary: 'Helps customers with tickets, orders and refunds.',
    menu: ['order-tracking', 'customers', 'promo-codes', 'support-tickets', 'items', 'barcodes', 'products', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'View, reply to and change the status of support tickets; suggested replies help you answer quickly',
      'Open a customer (Customer Management) to see everything they bought and when, what is still in their cart and their tickets, then email or call them',
      'Ask for a correction to a customer\'s details (Request change); the Super Admin makes it',
      'Look up promo codes to tell a customer which one to use: who and which products each is for, its limits and dates, and the orders that used it (Promo Codes). A code for chosen customers shows only as TINQA***: email it to them with "Email code"; show a code for every customer on the storefront with "Show on storefront"',
      'Look up the customer\'s order, payment and products from the ticket',
      'Request a refund and re-check its status with the payment gateway',
      'Trace a customer\'s device by its barcode: every part inside it, with its batch, purchase order and dealer (Barcode Tracking)',
    ],
    approves: [],
    tips: [
      'Suggested replies are never sent by themselves: you choose and edit before sending.',
      'Customer Management › "Items left in cart" lists customers who added products but did not order: a good list to follow up.',
    ],
  },
  {
    id: 'FINANCIAL_AUDITOR',
    name: 'Financial Auditor',
    summary: 'Checks the books. Read-only everywhere.',
    menu: ['finance', 'orders', 'store-sales', 'order-tracking', 'promo-codes', 'barcodes', 'payments', 'client-demos', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'View the company account overview, ledger, expenses and vouchers',
      'Export finance reports as PDF, Excel or Word',
      'Check what every product earns on delivered orders (Accounts & Finance › Product profit), product cost sheets and each customer order\'s profit',
      'Check the GST position and register: output tax, input tax credit, payable in cash per month, paid and outstanding',
      'View every month\'s salary payments and download any payslip (Payments & Chalans)',
      'View refunds, customer and procurement orders, documents',
      'See every agent\'s store sales (Store Sales)',
      'See every promo code, the orders that used it and the discount it gave (Promo Codes, view only)',
      'Trace any piece or product unit by its barcode, with its full history (Barcode Tracking)',
    ],
    approves: [],
    tips: [],
  },
  {
    id: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    summary: 'Runs company money: expenses, vouchers, payments and reports.',
    menu: ['finance', 'approvals', 'orders', 'store-sales', 'order-tracking', 'promo-codes', 'payments', 'client-demos', 'client-outreach', 'my-demos', 'my-meetings', 'my-payslips'],
    levelTwoMenu: ['approvals'],
    hasApprovalLevel: true,
    does: [
      'View and export the company account, ledger and reports',
      'See the profit of every product and customer order, before and after income tax (Accounts & Finance › Product profit, order details)',
      'Raise expenses and vouchers',
      'Each month, record the salaries transferred from the bank (Payments & Chalans): one employee with a bonus or deduction, or everyone unpaid at once; resend a payslip email',
      'Track GST payable each month (Accounts & Finance › GST) and record GST paid to the government as a GST payment voucher',
      'View refunds, customer and procurement orders, documents',
      'Pay dealers against each order\'s payment plan and collect their refunds: record the payment with its method, date and reference, correct or withdraw it until confirmed, reverse a confirmed one (Orders Management › the order › Payments to the dealer)',
      'See every agent\'s store sales and how they were paid (Store Sales)',
      'See every promo code, the orders that used it and the discount it gave (Promo Codes, view only)',
      'Schedule client demos and meetings step by step: every client visited at its own time, the products to demo (each unit taken by its barcode), the attending staff and a day-by-day quotation (travel, night stay and meals, plus any justified extra); send it for approval, record each day\'s stay, food, travel and other bills with their invoices, and send the visit for completion (Client Demos & Meetings)',
      'Log calls, emails, WhatsApp messages and visits with the businesses we pitch to (Client Outreach): add a business (one already on file by phone or email opens instead), log each contact with how it went, their interest and the next step with its follow-up date, attach screenshots or PDFs as proof, edit your own contacts, and work through My follow-ups; the summary shows contacts per day and per executive for any period',
    ],
    approves: [
      'Expenses and vouchers: approve, reject or reverse (approving posts them to the ledger)',
      'Client demo quotations before the visit, and completions after it: approving a completion books its bills as Travel & conveyance (Approvals Hub › Client demos)',
      'Salary transfers recorded by someone else: confirming books them as salaries and emails each payslip',
      'Payments to dealers and refunds from them recorded by someone else (Approvals Hub › Dealer payments), and the amount of a refund claim, with a reason',
    ],
    tips: [
      'You cannot approve a voucher you raised yourself, confirm a salary you recorded, or confirm your own salary.',
      'Confirm a salary only once the money has left the bank: it can\'t be undone. A wrong one is rejected and recorded again.',
      'You can\'t approve a client demo you planned, sent for approval or attend. A completed demo can only be corrected by a Super Admin.',
    ],
  },
  {
    id: 'SALES_AGENT',
    name: 'Store Sales Agent',
    summary: 'Sells devices at a store or in the market, for cash or online payment.',
    menu: ['store-sales', 'promo-codes', 'my-demos', 'my-meetings', 'my-payslips'],
    hasApprovalLevel: false,
    does: [
      'Find a walk-in customer by mobile number or email, or register them with their delivery address',
      'Add products (search by name, or scan a unit\'s barcode into the search box), get the total from the server and book the order: cash you received, or online by the customer',
      'Follow your own sales and whether the customer\'s email went out (Store Sales › My sales)',
      'Look up promo codes to tell a customer which one to use: who and which products each is for, its limits and dates, and the orders that used it (Promo Codes). A code for chosen customers shows only as TINQA***: email it to them with "Email code"; show a code for every customer on the storefront with "Show on storefront"',
      'Go on the client demos you are tagged on: hand the product units out and back, and record your own stay, food and travel bills (My Demos)',
    ],
    approves: [],
    tips: [
      'Book a cash sale only once you hold the full total: it is marked paid and booked to the company account at once, credited to you.',
      'Verify the customer\'s email before registering them: press Send code and type the 5-digit code they read out from their email. Their receipt, order updates, the tax invoice and a link to set their password all go there.',
      'A customer who lost the set-password link (it works for 15 minutes) uses "Forgot password" on the website sign-in page.',
      'If the total changed since you got it, the new total is shown: agree it with the customer and book again.',
      'Customers can\'t cancel or return a cash sale online; they come back to the store or contact customer support.',
      'Store sales don\'t take promo codes yet: a customer who has a code uses it when ordering on the website.',
    ],
  },
  {
    id: 'DEALER',
    name: 'Dealer',
    summary: 'A supplier signed in to their own dealer portal in this web app.',
    menu: ['dealer-quotations', 'dealer-orders'],
    hasApprovalLevel: false,
    does: [
      'Create quotations for TinQa at the item\'s existing price, or at a new quoted price with the reason for it, optionally with the GST breakup (CGST + SGST or IGST, rate, HSN/SAC, cess)',
      'Say how you want to be paid on each quotation: the advance and, if you want one, a midterm percentage (the final part, the rest of 100%, is paid after TinQa tests the delivered units) and the payment method you expect',
      'Request changes to a quotation while it is still a quotation, including its payment plan',
      'See what TinQa has paid you for each order, what is still to come, and any refund you owe when units fail testing (My Orders › View)',
      'Follow your orders: open quotations, ongoing orders and past orders',
      'Mark a confirmed order as shipped once the goods have left (My Orders › View)',
      'Print the quotation, purchase order and bill',
      'See your business details and change your password (My Profile)',
    ],
    approves: [],
    tips: [
      'You only ever see your own quotations and orders.',
      'Your invoice is checked against the quotation on delivery: bill the same total and GST, and show your GSTIN on it.',
      'The final payment is made only after the delivered units are tested, and only for the units that pass. Units that fail go back to you; if more was paid than the units that passed are worth, refund the difference.',
      'Your business details are kept by your Dealer Manager; ask them to change anything.',
    ],
  },
];

export const ROLE_GUIDES: Record<GuideRoleId, RoleGuide> = Object.fromEntries(ROLE_LIST.map((role) => [role.id, role])) as Record<
  GuideRoleId,
  RoleGuide
>;

export const GUIDE_ROLE_IDS: GuideRoleId[] = ROLE_LIST.map((role) => role.id);

/** How actors that are not roles of this app are named. */
export const EXTERNAL_ACTOR_NAMES: Record<GuideExternalActor, string> = { CUSTOMER: 'Customer', SYSTEM: 'TinQa' };

const ANY_STAFF: GuideActor[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'DEALER_MANAGER', 'CATALOG_SPECIALIST', 'FULFILLMENT_SPECIALIST',
  'DELIVERY_RIDER', 'FLEET_COORDINATOR', 'CUSTOMER_SUPPORT', 'FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SALES_AGENT'];

/** The roles that go on client demos (Procurement group CLIENT_DEMO_ATTENDANCE); only they can be tagged on one. */
const DEMO_ATTENDEES: GuideActor[] = ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER', 'SALES_AGENT'];

export const GUIDE_FLOWS: GuideFlow[] = [
  {
    id: 'sign-in',
    title: 'Signing in for the first time',
    summary: 'Employees choose their password through an emailed link; dealers start with the default password and change it.',
    steps: [
      { who: [...ANY_STAFF], label: 'New employee', kind: 'maker', text: 'Opens the "Set up your account" email at their personal email and chooses a password (the link works once, for 15 minutes).', where: 'Set my password (from the email)' },
      { who: ['DEALER'], label: 'Dealer', kind: 'maker', text: 'Signs in with the username and the default password they were given, then chooses their own. Nothing else opens until they do.', where: 'Login page › Reset password' },
      { who: [...ANY_STAFF, 'DEALER'], label: 'Everyone', kind: 'end', text: 'The sidebar lists only what your designation allows. My Profile is always there.' },
    ],
  },
  {
    id: 'forgot-password',
    title: 'Forgot password',
    summary: 'A link to choose a new password is emailed; it works once, for 15 minutes.',
    steps: [
      { who: [...ANY_STAFF, 'DEALER'], label: 'Everyone', kind: 'maker', text: 'Chooses "Forgot password?" and enters their username or email.', where: 'Login page › Forgot password?' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Emails a link (to the personal email for employees). The page never says whether an account matched.' },
      { who: [...ANY_STAFF, 'DEALER'], label: 'Everyone', kind: 'maker', text: 'Opens the link and chooses a new password. Every other session is signed out; an expired link offers a new one.', where: 'Set password (from the email)' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Does the same on the storefront: "Forgot password?" on the sign-in page, with their email.' },
    ],
  },
  {
    id: 'employee',
    title: 'Adding an employee',
    summary: 'Two Super Admins: one creates the account, the other approves it.',
    steps: [
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Enters the employee\'s personal email, presses Send code and types the 5-digit code the employee reads out from it (Verify).', where: 'Employee Management › Create' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Creates the employee and picks a designation and Level 1 or Level 2.', where: 'Employee Management' },
      { who: ['SUPER_ADMIN'], label: 'Another Super Admin · Level 2', kind: 'checker', text: 'Approves the new account.', where: 'Approvals Hub › Requests', otherwise: 'Reject → the account cannot sign in' },
      { who: [...ANY_STAFF], label: 'New employee', kind: 'end', text: 'Gets a "Set up your account" email at their personal email, chooses a password through it and signs in to their menu.' },
    ],
  },
  {
    id: 'dealer-onboarding',
    title: 'Onboarding a dealer and their login',
    summary: 'A dealer record first, then a web login that a different Level 2 approves.',
    steps: [
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Adds the dealer with its business details and the item categories it deals in; the dealer only sees and quotes for items in those categories.', where: 'Dealer Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Creates the dealer\'s web login inside the dealer\'s details. It starts with the default password.', where: 'Dealer Management › dealer › Login' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Another Dealer Manager · Level 2', kind: 'checker', text: 'Approves the login. The person who created it cannot.', where: 'Approvals Hub › Dealers', otherwise: 'Reject → the login cannot sign in' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Signs in, sets a new password and sees My Quotations and My Orders.' },
    ],
  },
  {
    id: 'procurement',
    title: 'Buying from a dealer',
    summary: 'From quotation to goods at the warehouse. Every step moves forward only.',
    steps: [
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN', 'DEALER'], label: 'Dealer Manager or Dealer', kind: 'maker', text: 'Records a quotation: items, quantities, prices (before GST), dates, optionally the GST breakup, and the payment plan: advance % and midterm % (the final part, the rest, is paid after testing) and the payment method the dealer expects.', where: 'Orders Management · My Quotations' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Submits the quotation for approval. It shows as "Under review" to the dealer. Quotations a dealer sent in wait in the Approvals Hub.', where: 'Approvals Hub › Requests · Orders Management', otherwise: 'Cancel → with a reason; the dealer is told' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Approves the order with its payment plan, which then waits for the dealer. From now on the advance can be paid.', where: 'Approvals Hub › Requests', otherwise: 'Reject → the order is cancelled' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Records that the dealer confirmed the order. The purchase order can now be printed.', where: 'Orders Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN', 'DEALER'], label: 'Dealer or Dealer Manager', kind: 'maker', text: 'Marks the confirmed order as shipped once the goods have left. The procurement team is notified.', where: 'My Orders · Orders Management', otherwise: 'Cancel is possible only before shipment, with a reason' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: "Uploads the dealer's invoice PDF. TinQa reads it and checks the total, the GST and the dealer's GSTIN against the quotation.", where: 'Orders Management › Update status › Mark delivered' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: "Only when the invoice doesn't match or can't be read: accepts it with a reason, or asks the dealer for a corrected invoice.", where: 'Orders Management › Update status', otherwise: 'No override → upload a correct invoice; the order stays shipped' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Marks it delivered with the actual delivery date. The bill can now be printed.', where: 'Orders Management' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Picks the delivered order, records the units that passed testing and scans one barcode per passed unit. Nothing is booked yet; defected units go back.', where: 'Item Management › Stocks › Add stock' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves the stock entry, which also locks its barcodes. Only now is the purchase booked to the company account, with its GST as input tax, and testing is done: the order is worth only the units that passed, and the final payment can be made.', where: 'Approvals Hub › Requests', otherwise: 'Reject → stock is not added, nothing is booked and its barcodes are freed' },
      { who: ['SYSTEM'], label: 'Inventory', kind: 'end', text: 'Stock is available to sell.' },
      { who: ['SYSTEM'], label: 'Company ledger & GST register', kind: 'end', text: 'The purchase (approved passed units × unit price + shipment) and its GST are posted. A later change to the entry waits for Level 2 again; only an approved change posts the difference.', where: 'Accounts & Finance' },
    ],
  },
  {
    id: 'dealer-change',
    title: 'A dealer changes their quotation',
    summary: 'Dealers never edit directly: every change is a request any Dealer Manager (Level 1 or 2) decides.',
    steps: [
      { who: ['DEALER'], label: 'Dealer', kind: 'external', text: 'Opens the quotation and requests a change. Only possible while it is still a quotation.', where: 'My Quotations' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'The quotation is frozen for everyone (no edit, submit or cancel) until the request is decided.' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 1 or 2', kind: 'checker', text: 'Compares old and new values and approves or rejects.', where: 'Approvals Hub › Dealers', otherwise: 'Reject → the quotation stays as it was' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Sees the updated quotation, which carries on through approval.' },
    ],
  },
  {
    id: 'procurement-return',
    title: 'Returning goods to a dealer',
    summary: 'For a delivered order, some or all goods can go back for a refund.',
    steps: [
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Requests a return with a reason.', where: 'Orders Management' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager · Level 2', kind: 'checker', text: 'Approves the return once the dealer agrees.', where: 'Approvals Hub › Requests', otherwise: 'Reject → with a reason; the order stays delivered and closes' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Marks it picked up, then received by the dealer.' },
      { who: ['DEALER_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager', kind: 'maker', text: 'Records the dealer\'s refund: initiated, then completed.', otherwise: 'Refund failed → initiate it again' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Follows the return in My Orders.' },
    ],
  },
  {
    id: 'dealer-payment',
    title: 'Paying a dealer',
    summary: 'Advance, midterm and final payment against the quotation\'s plan; the final part only after testing, for the units that passed.',
    steps: [
      { who: ['DEALER_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager or Finance Manager', kind: 'maker', text: 'Once the order is approved, records the advance actually paid (any amount up to the advance and midterm parts, e.g. 25% or 50%), with the method, date and reference (UTR, cheque number).', where: 'Orders Management › the order › Payments to the dealer', otherwise: 'A mistake → correct or withdraw it while it waits; reverse it once confirmed' },
      { who: ['DEALER_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager or Finance Manager · Level 2', kind: 'checker', text: 'Someone other than the recorder confirms it. Only confirmed payments count as paid.', where: 'Approvals Hub › Dealer payments', otherwise: 'Reject → with a reason; nothing is counted' },
      { who: ['DEALER_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager or Finance Manager', kind: 'maker', text: 'Once the dealer has shipped, records the midterm payment the same way. Until testing, at most the advance and midterm parts can be paid in all.' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'When the order is marked delivered, the status dialog shows what was paid and what is still to pay.' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves the stock entry with the units that passed and failed testing. The order is now worth the passed units × unit price + shipment, with its GST.', where: 'Approvals Hub › Requests' },
      { who: ['DEALER_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager or Finance Manager', kind: 'maker', text: 'Records the final payment: whatever is still to pay for the units that passed. It is confirmed like the others.' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'If more was paid than the order is now worth (units failed, or the order was cancelled or returned after a payment), a refund claim against the dealer opens by itself, naming the failed units; the dealer and the payments team are told.' },
      { who: ['DEALER_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager or Finance Manager · Level 2', kind: 'checker', text: 'May change the amount the dealer must refund (at most what was overpaid), with a reason, e.g. after agreeing a deduction.', where: 'Orders Management › the order › Refund due from the dealer' },
      { who: ['DEALER_MANAGER', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager or Finance Manager', kind: 'maker', text: 'Records the refund the dealer paid back; once confirmed by someone else the claim is settled.' },
      { who: ['DEALER'], label: 'Dealer', kind: 'end', text: 'Sees each confirmed payment, what is still to come and any refund owed (My Orders › View).' },
    ],
  },
  {
    id: 'product',
    title: 'A new product on the storefront',
    summary: 'Products go live only after a Level 2 Store Manager approves them.',
    steps: [
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Creates the item, with one or more categories, attributes and warranties.', where: 'Item Management' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Enters the product with its own model name (its version, v0.1, v0.2…, is given by its title), or adapts it from an earlier version picked in the title. Optionally saves the product as a draft first (title and category are enough) and finishes it later; a draft holds no stock and is not sent for approval. To change the components of a product that has already been sold, creates a new version of it instead: a draft copy whose components can change.', where: 'Products Management › Save as draft · Create new version' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Creates the product from items (components), its category (an existing one or a new one), GST-inclusive price, GST rate and HSN/SAC, and warranties, scans the first unit\'s barcode and the barcode of every component piece fitted into it, and submits it for approval. An accessory also lists the products it is offered with and the extra discount with each.', where: 'Products Management' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Enters what one unit costs: each component\'s unit cost (filled from its purchase price) and extra costs such as manpower or software with their reasons, and checks the profit before and after tax shown in the form.', where: 'Products Management › Costing & profit' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Reviews the snapshot, including the GST split of the price, one unit\'s cost, margin and profit after tax, and the unit and piece barcodes, and approves, which activates the product and locks its barcodes.', where: 'Approvals Hub › Requests', otherwise: 'Reject → back with a reason; its pieces return to stock. Fix and resubmit; the barcodes entered last time are filled in' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'Publishes it to the storefront. Later edits go for approval again; the live product stays unchanged until approved. Turning on a new version turns off the version it was adapted or copied from.', where: 'Products Management' },
      { who: ['FULFILLMENT_SPECIALIST', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Adds units to stock: one row per unit with its own barcode and the barcode of every piece fitted into it, saved as a draft while scanning and added once every unit is complete.', where: 'Products Management › Stock entry' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Can buy it.' },
    ],
  },
  {
    id: 'barcode-trace',
    title: 'Tracing a device by its barcode',
    summary: 'Every piece and every product unit carries its own barcode, so a device can be traced back to each part\'s dealer.',
    steps: [
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'DEALER_MANAGER', 'CATALOG_SPECIALIST', 'FULFILLMENT_SPECIALIST', 'FINANCIAL_AUDITOR', 'SUPER_ADMIN'], label: 'Any role with Barcode Tracking', kind: 'maker', text: 'Scans or types the barcode on the device or on a part.', where: 'Barcode Tracking' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Shows the product unit and every part inside it, or the part and the unit it is fitted into: item, batch, purchase order, dealer, delivery date, who received and approved it, and its full history.' },
    ],
  },
  {
    id: 'barcode-correction',
    title: 'Correcting a barcode',
    summary: 'Barcodes are locked once approved. Only a Level 2 Super Admin changes one.',
    steps: [
      { who: ['STORE_MANAGER', 'FULFILLMENT_SPECIALIST', 'SUPER_ADMIN'], label: 'Store Manager, Fulfillment or Super Admin', kind: 'maker', text: 'Opens the barcode and asks for a correction with the right code and a reason, or asks for barcodes for stock received before barcodes were recorded.', where: 'Barcode Tracking › Correct barcode · Stock details › Assign barcodes' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'checker', text: 'Approves or rejects the request. A Super Admin\'s own correction is applied at once.', where: 'Approvals Hub › Barcodes', otherwise: 'Reject → the barcode stays as it is; the requester is told why' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Records the change in the barcode\'s history; the old code is free again.' },
    ],
  },
  {
    id: 'customer-order',
    title: 'Customer order to the doorstep',
    summary: 'An order is confirmed only once it is fully paid. Every step moves forward only.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Places and pays for an order on the store.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Confirms the paid order, then moves it to processing and packed.', where: 'Customer Order Tracking', otherwise: 'Not paid → it cannot be confirmed yet' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Marks it shipped. Shipping costs entered here become expense vouchers.' },
      { who: ['FLEET_COORDINATOR', 'FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fleet Coordinator', kind: 'maker', text: 'Keeps tracking up to date while it is in transit.' },
      { who: ['DELIVERY_RIDER', 'FLEET_COORDINATOR'], label: 'Delivery Rider', kind: 'maker', text: 'Records out for delivery, then delivered, using the order\'s shipping address.', otherwise: 'Customer unavailable, invalid address or refused → re-attempt' },
      { who: ['FLEET_COORDINATOR', 'FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fleet Coordinator', kind: 'maker', text: 'Sends a parcel that cannot be delivered back to the warehouse.' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Sees every update in their order tracking.' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Anyone who sees costs', kind: 'end', text: 'Sees the order\'s profit on the order: each line at its cost when ordered, plus shipping charged less shipping paid, before and after tax.', where: 'Customer Order Tracking › order' },
    ],
  },
  {
    id: 'product-profit',
    title: 'Product cost and profit',
    summary: 'What a product costs to make and what it earns, from the product form to the books. Amounts exclude GST.',
    steps: [
      { who: ['DEALER_MANAGER', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Dealer Manager / Store Manager', kind: 'maker', text: 'Items are bought and their stock approved; each stock entry carries its purchase price and freight.', where: 'Procurement Orders, Stock' },
      { who: ['CATALOG_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Catalog Specialist', kind: 'maker', text: 'In the product form, each component\'s unit cost is filled from what the next unit in stock cost and can be adjusted. Adds extra costs (manpower, software, packaging…) with how each was worked out, and reads the live profit, margin, income tax and profit after tax.', where: 'Products Management › Costing & profit' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Sees one unit\'s cost, margin and profit after tax with the approval request. Cost changes to a live product go for approval like any other edit.', where: 'Approvals Hub › Requests', otherwise: 'Reject → back with a reason' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Every order line keeps the unit cost of the day it was ordered, so later cost changes never rewrite past profit. Shipping costs entered when the order ships are counted against that order.' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Anyone who sees costs', kind: 'end', text: 'Reads the profit of an order (order details), of a product (product details) and of every product in a period, before and after income tax.', where: 'Accounts & Finance › Product profit' },
    ],
  },
  {
    id: 'pre-order',
    title: 'Pre-orders',
    summary: 'A customer can order an item that is out of stock; staff accept it once stock is there.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Orders an out-of-stock item. It arrives as a pre-order.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Puts it on "Wait for stock" until enough stock arrives.', where: 'Customer Order Tracking' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment or Store Manager', kind: 'checker', text: 'Checks requested quantity against stock and accepts the pre-order. It must be fully paid.', where: 'Approvals Hub › Pre-orders', otherwise: 'Cancel if it cannot be fulfilled' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Stock is reserved and the order carries on like any other.' },
    ],
  },
  {
    id: 'customer-return',
    title: 'Customer return',
    summary: 'A delivered order can be returned; paid orders are refunded after inspection.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Asks to return a delivered order.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment or Store Manager', kind: 'checker', text: 'Approves or rejects the return.', where: 'Customer Order Tracking', otherwise: 'Reject → the order stays delivered and closes' },
      { who: ['FULFILLMENT_SPECIALIST', 'FLEET_COORDINATOR', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment / Fleet', kind: 'maker', text: 'Out for pickup, picked up, in transit, received at the warehouse.' },
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfillment', kind: 'maker', text: 'Inspects the item, then refunds a paid order or closes an unpaid one.', otherwise: 'Inspection failed → no refund, order closes' },
    ],
  },
  {
    id: 'refund',
    title: 'Refund for a customer',
    summary: 'Refunds go through the payment gateway (Razorpay) after a Level 2 approval.',
    steps: [
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Requests a refund on the order.', where: 'Customer Order Tracking › order' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves the refund, which sends it to the payment gateway.', where: 'Approvals Hub › Refunds', otherwise: 'Reject → with a reason; payment status goes back' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Re-checks the status with the gateway if it is slow.', otherwise: 'Refund failed → it can be initiated again' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Gets the money back; the order closes.' },
    ],
  },
  {
    id: 'support',
    title: 'Support ticket',
    summary: 'Customers raise tickets from the store; support answers them here.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Raises a ticket about an order or product.' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Opens the ticket, checks the linked order and picks or edits a suggested reply.', where: 'Support Tickets' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Customer Support', kind: 'maker', text: 'Sends the reply and updates the status (e.g. resolved).' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Sees the reply on the store.' },
    ],
  },
  {
    id: 'customer-change',
    title: 'Customer detail change',
    summary: 'A customer asks to correct their details; customer care asks and only the Super Admin changes them.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Asks support to correct their name, phone number or date of birth.' },
      { who: ['CUSTOMER_SUPPORT', 'STORE_MANAGER'], label: 'Customer Support', kind: 'maker', text: 'Opens the customer, fills in the new values and the reason and sends the request. Nothing changes yet.', where: 'Customer Management › Request change' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'checker', text: 'Gets a notification with the requested values, opens the customer from it, checks and saves the change with a reason.', where: 'Customer Management › Edit details', otherwise: 'If the request is wrong, the details are left as they are.' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'end', text: 'Sees the corrected details in their account. The email address (their sign-in) is never changed here.' },
    ],
  },
  {
    id: 'reviews',
    title: 'Product reviews',
    summary: 'Store Managers decide which customer reviews show on the store.',
    steps: [
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Reviews a product they bought.' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager', kind: 'maker', text: 'Publishes or hides the review.', where: 'Reviews' },
      { who: ['CUSTOMER'], label: 'Storefront', kind: 'end', text: 'Published reviews count towards the product\'s rating.' },
    ],
  },
  {
    id: 'store-sale',
    title: 'Store sale (cash or online)',
    summary: 'An agent sells to a walk-in customer; cash they received counts at once, and the customer is emailed.',
    steps: [
      { who: ['SALES_AGENT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Sales Agent', kind: 'maker', text: 'Finds the customer by mobile number or email, or registers them with a delivery address (no password) after verifying their email with the 5-digit code sent to it.', where: 'Store Sales › New sale' },
      { who: ['SALES_AGENT', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Sales Agent', kind: 'maker', text: 'Adds the products (found by name, or by scanning a unit\'s barcode into the search box), gets the total and books the order: cash received (with the receipt number) or online. The sale is credited to them.', where: 'Store Sales › New sale' },
      { who: ['SYSTEM'], label: 'Company ledger', kind: 'end', text: 'Cash: the order is paid and confirmed at once, and the sale, shipping and GST collected are booked naming the agent. Fulfilment continues as for any order; the tax invoice is issued when it ships.' },
      { who: ['SYSTEM'], label: 'Customer email', kind: 'end', text: 'The customer is emailed the order, the receipt (PDF), how to sign in and track it, and for a new customer their user ID and a "Set my password" link (works once, for 15 minutes).', where: 'Store Sales › My sales shows whether it was sent' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Sets their password through the link (or "Forgot password" later); for an online sale, pays from their account.' },
      { who: ['STORE_MANAGER', 'FINANCE_MANAGER', 'FINANCIAL_AUDITOR', 'SUPER_ADMIN'], label: 'Store / Finance', kind: 'end', text: 'See every agent\'s sales, how they were paid and whether the customer was emailed.', where: 'Store Sales › All store sales' },
    ],
  },
  {
    id: 'order-emails',
    title: 'Order emails to the customer',
    summary: 'The customer hears about the steps that matter, at the email they verified.',
    steps: [
      { who: ['FULFILLMENT_SPECIALIST', 'STORE_MANAGER', 'SUPER_ADMIN'], label: 'Fulfilment', kind: 'maker', text: 'Moves the order on: confirmed, shipped (the tax invoice is issued), out for delivery.', where: 'Order Tracking' },
      { who: ['DELIVERY_RIDER', 'FLEET_COORDINATOR'], label: 'Delivery', kind: 'maker', text: 'Records out for delivery and delivered at the door.', where: 'Order Tracking' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Emails the customer at each of those steps; the delivered email carries the GST tax invoice as a PDF. A cash store sale skips the confirmation email (its welcome email says so).' },
    ],
  },
  {
    id: 'email-setup',
    title: 'Customer email setup',
    summary: 'Customer and staff emails go out from the mail server and sender a Level 2 Super Admin sets.',
    steps: [
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Enters the mail server, port, security, login and the sender address and name, saves, and sends a test email.', where: 'Company Profile › Email' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Queued emails go out within a minute, with retries if the mail server is down; the card shows how many wait or failed. Until email is set up, verification codes and password links can\'t be sent, so new registrations and "Forgot password" wait for it.' },
    ],
  },
  {
    id: 'expense',
    title: 'Company expense or voucher',
    summary: 'Nothing is posted to the company account until a different Level 2 Finance Manager approves it.',
    steps: [
      { who: ['STORE_MANAGER', 'DEALER_MANAGER', 'FULFILLMENT_SPECIALIST', 'FLEET_COORDINATOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Any staff who raise expenses', kind: 'maker', text: 'Raises an expense and attaches the bill. The bill fills in the form; GST splits into CGST + SGST or IGST from the GSTINs.', where: 'Accounts & Finance › Expenses & vouchers' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Approves, rejects or later reverses it.', where: 'Approvals Hub › Expenses', otherwise: 'Reject → the maker can fix and resubmit while it awaits approval' },
      { who: ['SYSTEM'], label: 'Company ledger', kind: 'end', text: 'The entry is posted to the ledger. A GST bill\'s GST is claimed as input tax credit and recorded in the GST register, unless it was marked as blocked credit.' },
      { who: ['FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Financial Auditor', kind: 'end', text: 'Reviews the overview and ledger and exports PDF, Excel or Word reports.', where: 'Accounts & Finance' },
    ],
  },
  {
    id: 'salary',
    title: 'Monthly salary and payslip',
    summary: 'Salaries are transferred from the bank; nothing is booked or emailed until a different Level 2 confirms the transfer.',
    steps: [
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Transfers the salaries from the bank, then records them for the month: everyone unpaid at once at their monthly salary, or one employee with this month\'s bonus, overtime, unpaid leave, TDS or PF. Adds the transfer date and bank reference (UTR).', where: 'Payments & Chalans › choose the month' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Checks the transfers against the bank and confirms them (one by one or all waiting at once). Nobody confirms a salary they recorded or their own.', where: 'Payments & Chalans', otherwise: 'Reject with a reason → the recorder corrects it and records it again; before anyone decides, the recorder can also withdraw it' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Each confirmed salary is booked in Accounts & Finance under Salaries & staff costs (the net pay, on the transfer date) and the payslip PDF is emailed to the employee\'s personal email, or their sign-in email. A failed email is retried; "Resend" sends it again.' },
      { who: ANY_STAFF, label: 'Every employee', kind: 'end', text: 'Opens and downloads their payslip for any confirmed month. It is created fresh each time from the confirmed payment.', where: 'My Payslips' },
    ],
  },
  {
    id: 'client-demo',
    title: 'Client demo or meeting',
    summary: 'A visit to a client is planned as a quotation, approved, its bills recorded day by day, and its completion approved before the costs are booked as travel.',
    steps: [
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Schedules the trip step by step: the start date and number of days, then each client visited (kind of place, name, its own phone and email, address, PIN code (which fills in the city and state) and Google Maps location, contact person, legal name and GSTIN for businesses, and the day and time there, picked on the clock; visits never overlap, and the same client is never visited twice in a row on a day), Appointment or Promotion, the products to demo with each unit taken picked by its barcode (scanned, typed, or ticked from the product\'s units in stock; a unit another demo has on those days can\'t be picked), the attending staff (only Super Admins, Store Managers, Finance Managers and Store Sales Agents go on demos, so only they are offered), and the quotation: day by day, the optional journeys (as many as needed, one after another, each with its departure and arrival picked as one range (the day, then the time on the clock), in an order that can be changed by dragging, where time already taken by a visit or another journey is greyed out), night stay (a hotel client of the trip or another hotel, with check-in and check-out picked as one range) and meals with their expected amounts; the proposed budget is their total plus any extra, which needs its reason and breakup. Saves it as a draft or sends the quotation for approval.', where: 'Client Demos & Meetings › Schedule a demo' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Approves the budget before the visit. Nobody approves a demo they planned, sent or attend. The attending staff are told.', where: 'Approvals Hub › Client demos', otherwise: 'Reject with a reason → back to draft to fix and send again. Changing the budget or number of days of an approved demo sends it back here' },
      { who: DEMO_ATTENDEES, label: 'Attending staff', kind: 'maker', text: 'On the demo\'s days, scan the product units you take and Hand out: they leave stock (also on the storefront, so nobody can buy them meanwhile). After the demo, scan them back and Hand back: they are in stock again.', where: 'My Demos › the demo › Units taken', otherwise: 'A unit already sold online can\'t be handed out: pick another unit in the plan' },
      { who: DEMO_ATTENDEES, label: 'Attending staff', kind: 'maker', text: 'While the visit runs, record your own stay, food and travel bills for each day, with the invoice or ticket (PDF or photo). Invoices for the planned stays and meals are attached here too.', where: 'My Demos' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Keeps every bill of the visit (stay, food, travel, other costs with their reason) and, after the visit and once every unit taken is handed back, sends it for completion with the outcome. Changes to recorded bills need a reason; the demo\'s timeline keeps them all.', where: 'Client Demos & Meetings › the demo' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Checks the bills and invoices against the budget and approves the completion.', where: 'Approvals Hub › Client demos', otherwise: 'Reject with a reason → back to the running demo to correct its bills' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'The total spent is booked in Accounts & Finance under Travel & conveyance, dated the last day of the visit.' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Writes off, with the reason, a unit that did not come back from the demo (lost or damaged): it leaves stock for good with its parts, and the demo can then be completed.', where: 'Client Demos & Meetings › the demo › Units taken' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Only a Super Admin changes a completed demo: Reopen for correction with a reason, correct it, and send it for approval again. When it is approved, only the difference to what was booked is booked.', where: 'Client Demos & Meetings › the demo', otherwise: 'Until the correction is approved, what was booked stays booked' },
    ],
  },
  {
    id: 'custom-role',
    title: 'Creating a custom role',
    summary: 'A Super Admin builds a new designation, such as Marketing Executive, from the permission groups they hold, then gives it to employees.',
    steps: [
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Opens Roles & permissions and presses New role: enters its name (its code is made from it and never changes), department and description, and ticks the permission groups it carries. Only groups you hold yourself are offered; groups marked Level 2 only reach Level 2 employees only, and self-service is always included.', where: 'Employee Management › Roles & permissions' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Gives the role to an employee like any other designation, when creating them or under Manage access.', where: 'Employee Management' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin', kind: 'maker', text: 'Edits the role\'s groups when the job changes (its employees get them at their next sign-in), deactivates a role no longer given, or deletes one nobody holds.', where: 'Employee Management › Roles & permissions', otherwise: 'A role still held by employees cannot be deleted: deactivate it instead' },
      { who: [...ANY_STAFF], label: 'Employee', kind: 'end', text: 'Signs in to the menu the role\'s groups open.' },
    ],
  },
  {
    id: 'client-outreach',
    title: 'Client outreach',
    summary: 'Every call, email, WhatsApp message and visit with a business we pitch to is logged, with how it went and when to follow up.',
    steps: [
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER'], label: 'Outreach executive', kind: 'maker', text: 'Searches the business by name, phone or email; adds it when it is new (a business already on file by phone or email is opened instead, so nobody pitches it twice by mistake).', where: 'Client Outreach › Businesses' },
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER'], label: 'Outreach executive', kind: 'maker', text: 'Logs the contact: channel, date and time, who they spoke with, what was discussed and the response, how it went, their interest and the next action. A call back, demo or meeting needs its follow-up date and time. Screenshots, photos or PDFs (up to 5, 5 MB each) can be attached as proof. Only the person who logged a contact edits it.', where: 'Client Outreach › the business › Log contact' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'external', text: 'At 9:00 on the follow-up day, reminds the person who logged it.' },
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER'], label: 'Outreach executive', kind: 'end', text: 'Works through My follow-ups and logs the next contact; the summary shows contacts per day and per executive, demo requests and follow-ups due for any period.', where: 'Client Outreach' },
    ],
  },
  {
    id: 'meeting-schedule',
    title: 'Scheduling a meeting',
    summary: 'An online or face-to-face meeting with a client, business, dealer or the team is scheduled without approval; the invitees are emailed, and the organiser completes it afterwards so everyone gives feedback.',
    steps: [
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER', 'FULFILLMENT_SPECIALIST', 'FINANCIAL_AUDITOR'], label: 'Organiser', kind: 'maker', text: 'Chooses Online (creates the meeting on Google Meet, Teams or Zoom first and pastes its https link) or Face-to-face (the place, its address and optionally its Google Maps link). Adds the meeting name, subject, description and type (Client, B2B, Business-to-dealer, Client-to-client, Internal or Other), the client or business with a short description and contact, the day and the start and end on the clock (the same day, at most 12 hours; time when the organiser or an invitee is already in another meeting is greyed out), and searches for the staff to invite. Anyone already in another meeting at that time is named in a warning, and the meeting can\'t be saved until the time or the invitees change. The meeting ID (MTG-year-number) is generated on save.', where: 'Client Demos & Meetings › Meetings › Schedule meeting' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Emails each invitee the invite with a calendar file and tells them in the app. 24 hours before the start, everyone still invited is reminded.' },
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER', 'FULFILLMENT_SPECIALIST', 'FINANCIAL_AUDITOR'], label: 'Organiser', kind: 'maker', text: 'While it is scheduled: edits it (a change of time, place or link emails the attendees again), invites more people, or invites someone in place of an attendee who declined.', where: 'the meeting › Edit / Invite more / Invite replacement', otherwise: 'Cancel meeting with a reason: every attendee is emailed and told' },
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'FINANCE_MANAGER', 'FULFILLMENT_SPECIALIST', 'FINANCIAL_AUDITOR'], label: 'Organiser', kind: 'maker', text: 'Once the meeting has started, marks it completed: every attendee who did not decline, the organiser included, is asked for feedback. The organiser and anyone who sees every meeting read all the feedback on the meeting\'s page.', where: 'the meeting › Mark completed' },
    ],
  },
  {
    id: 'meeting-attend',
    title: 'Attending a meeting',
    summary: 'An invitee may decline within 24 hours of the invite, with a reason; after that they must attend, and give their feedback once the meeting is completed.',
    steps: [
      { who: ANY_STAFF, label: 'Invitee', kind: 'maker', text: 'Opens the meeting from the email, the notification or My Meetings: its time, the join link or the place with its map, the subject and who else is invited.', where: 'My Meetings › the meeting' },
      { who: ANY_STAFF, label: 'Invitee', kind: 'maker', text: 'Can\'t go? Declines with a reason, within 24 hours of being invited (never after the start); the page shows until when. After that you must attend. The organiser is told and may invite someone instead.', where: 'the meeting › Decline' },
      { who: ANY_STAFF, label: 'Attendee', kind: 'maker', text: 'Once the organiser marks the meeting completed, gives feedback: the agenda, how it went, what was decided, whether a deal was confirmed (with notes), the meeting type and a rating from Excellent to Worse. My Meetings shows a count until it is given; once sent it is final and read-only.', where: 'My Meetings › Give feedback' },
    ],
  },
  {
    id: 'careers',
    title: 'Hiring through Careers',
    summary: 'A job opening is posted on the website, candidates apply with a PDF résumé, and each shortlist and selection is confirmed by a Level 2 approver. The candidate is emailed at every step.',
    steps: [
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'SUPER_ADMIN'], label: 'Store Manager / Catalog Specialist', kind: 'maker', text: 'Writes the opening (team, location, work mode, experience, optional salary, requirements, skills, deadline…) and publishes it. The job ID is given automatically.', where: 'Careers › New opening' },
      { who: ['CUSTOMER'], label: 'Candidate', kind: 'external', text: 'Applies on the website\'s Careers tab without an account: confirms their email with a 5-digit code, attaches a PDF résumé and is emailed a reference number.' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'SUPER_ADMIN'], label: 'Store Manager / Catalog Specialist', kind: 'maker', text: 'Opens the application: reads the résumé on the page and the résumé match (Strong, Weak or No match, with the skills found and missing), then shortlists it with a note, or rejects it.', where: 'Careers › the opening › the applicant', otherwise: 'Reject with a reason; the candidate is emailed unless unticked' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Confirms the shortlist; the candidate is emailed. Nobody confirms what they asked for.', where: 'Approvals Hub › Careers', otherwise: 'Return with a note → back to the screener' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'SUPER_ADMIN'], label: 'Store Manager / Catalog Specialist', kind: 'maker', text: 'Creates the meeting on Teams, Google Meet or Zoom (or plans a phone call or a visit), schedules the interview with its link, and records each outcome with a rating and feedback. The candidate is emailed the link with a calendar invite, and on every change.', where: 'Careers › the applicant › Schedule interview' },
      { who: ['STORE_MANAGER', 'CATALOG_SPECIALIST', 'SUPER_ADMIN'], label: 'Store Manager / Catalog Specialist', kind: 'maker', text: 'Once an interview is passed, selects the candidate with a note.', where: 'Careers › the applicant › Select' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Confirms the selection.', where: 'Approvals Hub › Careers', otherwise: 'Return with a note → back to interviewing' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'The candidate is emailed that they are selected. Résumés of candidates who were not selected and did not join the talent pool are deleted after the retention period.' },
    ],
  },
  {
    id: 'promo-codes',
    title: 'Promo codes',
    summary: 'The Super Admin creates a code. A code for chosen customers is shown in full only to the Super Admin; staff email it to those customers. A code for everyone can be put on the storefront. The customer types or picks the code at checkout.',
    steps: [
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Creates the code: keeps the suggested one (TINQA + 15 random capital and small letters), presses Suggest another or types their own (TINQA + 15 to 25 letters, at least 20 characters; capital and small letters matter). Sets the discount as a percentage or as an amount off each unit (at most ₹1,000), one of the two (either replaces the product\'s own discount, never adds to it), all or chosen customers, all or chosen products (each chosen product with its units: all units or a number; for all products one units-per-product number, empty = every unit), uses per customer, total uses and the dates (6 months, 1 year, 2 years or custom). The code can\'t be changed afterwards.', where: 'Promo Codes › New promo code' },
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'SALES_AGENT', 'CUSTOMER_SUPPORT', 'FINANCE_MANAGER', 'FINANCIAL_AUDITOR'], label: 'Senior staff', kind: 'maker', text: 'Look the code up (search by its start, filter by status) and open it to check who and which products it is for, its limits and dates. A code for everyone they can tell the customer; a code for chosen customers they see only as TINQA***. Nobody but the Super Admin changes a code.', where: 'Promo Codes › the code' },
      { who: ['SUPER_ADMIN', 'STORE_MANAGER', 'SALES_AGENT', 'CUSTOMER_SUPPORT'], label: 'Sharers', kind: 'maker', text: 'A code for chosen customers: "Email code" (one customer) or "Email all" sends each an email with the code, its offer and dates. A code for everyone: "Show on storefront" puts it and its offer on every page of the website and at checkout, until removed or no longer usable.', where: 'Promo Codes › the code › Customers · Storefront' },
      { who: ['CUSTOMER'], label: 'Customer', kind: 'external', text: 'Gets their code by email, or sees a storefront offer on the website. Sees the promo code box at checkout only while a code is open to them, types the code exactly as given (or presses Use on an offer) and sees the discount in the order summary. One code per order.' },
      { who: ['SYSTEM'], label: 'TinQa', kind: 'end', text: 'Keeps each use with its order and the discount it gave (Promo Codes › the code › Use history). A cancelled order gives its use back; a delivered or returned one keeps it.' },
      { who: ['SUPER_ADMIN'], label: 'Super Admin · Level 2', kind: 'maker', text: 'Edits everything but the code itself (customers, products and their units, limits, dates; the new settings apply to later orders), switches it off after confirming and back on, or deletes it: hidden and unusable, kept with its orders, found under the Deleted filter and restored from there.', where: 'Promo Codes › the code › Edit · Switch off · Delete · Restore' },
    ],
  },
  {
    id: 'gst',
    title: 'GST: charged, paid and filed',
    summary: 'Every GST rupee is recorded once, in the GST register, when the document that makes it due or claimable is final.',
    steps: [
      { who: ['SYSTEM'], label: 'Customer order ships', kind: 'end', text: 'The tax invoice is issued and its CGST + SGST or IGST becomes output tax of that month. A refund afterwards issues a credit note that takes its share back.', where: 'Accounts & Finance › GST' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager · Level 2', kind: 'checker', text: 'Approves a dealer\'s stock entry: the purchase\'s GST (from the quotation) becomes input tax, claimable when the dealer has a GSTIN.', where: 'Approvals Hub › Requests' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager · Level 2', kind: 'checker', text: 'Approves expense bills: their GST is input tax credit unless marked as blocked credit.', where: 'Approvals Hub › Expenses' },
      { who: ['FINANCIAL_AUDITOR', 'FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance', kind: 'end', text: 'Each month: input tax credit is set off against output tax (IGST first; CGST never pays SGST). What is left is paid in cash with GSTR-3B (due on the 20th; GSTR-1 on the 11th).', where: 'Accounts & Finance › GST' },
      { who: ['FINANCE_MANAGER', 'SUPER_ADMIN'], label: 'Finance Manager', kind: 'maker', text: 'Raises the GST payment as a "GST paid to the government (challan)" voucher; a different Level 2 approves it and the outstanding amount drops.', where: 'Accounts & Finance › Expenses & vouchers' },
    ],
  },
  {
    id: 'company-profile',
    title: 'Company profile change',
    summary: 'The store\'s branding (logo, home page video, both sign-in pages) and legal details change only through an approved version, one section at a time.',
    steps: [
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Store Manager', kind: 'maker', text: 'Opens the section\'s tab, proposes a change, edits only that section and submits it. One change per section waits for approval. A draft can be withdrawn or deleted.', where: 'Company Profile › section tab' },
      { who: ['STORE_MANAGER', 'SUPER_ADMIN'], label: 'Another Level 2', kind: 'checker', text: 'Sees only that section\'s changes and approves or rejects them.', where: 'Approvals Hub › Company profile', otherwise: 'Reject → back to the drafter with a reason' },
      { who: ['SYSTEM'], label: 'Company profile', kind: 'end', text: 'That section goes live; the other sections stay as they are. Earlier versions stay in history.' },
    ],
  },
];

/** Good to know for everyone. */
export const GENERAL_NOTES: string[] = [
  'Level 1 prepares work, Level 2 also approves it. Roles with nothing to approve always work at Level 1.',
  'You never approve your own request: the maker and the approver are always two different people.',
  'Approve is green, reject and delete are red, caution actions are amber.',
  'If you open a page you are not allowed to see, the portal tells you so. Ask a Super Admin to change your designation or level.',
];

const isRole = (actor: GuideActor): actor is GuideRoleId => actor in ROLE_GUIDES;

/** The flows a role takes part in, in guide order. */
export const flowsFor = (role: GuideRoleId): GuideFlow[] => GUIDE_FLOWS.filter((flow) => flow.steps.some((step) => step.who.includes(role)));

/** Whether this step is one the role does itself. */
export const isOwnStep = (step: FlowStep, role: GuideRoleId | null): boolean => !!role && step.who.includes(role);

/** The roles that appear in a flow. */
export const rolesIn = (flow: GuideFlow): GuideRoleId[] => [...new Set(flow.steps.flatMap((step) => step.who.filter(isRole)))];
