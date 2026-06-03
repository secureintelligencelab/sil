/* =====================================================================
   EVENTS  —  workshops, webinars, guest lectures & announcements.
   Edit this file whenever you have a new event or want to update one.
   ---------------------------------------------------------------------
   HOW TO ADD AN EVENT:
   Copy one { ... } block, paste it into the list, and edit the fields.
   Keep the commas between blocks. Newest/most relevant first is nice,
   but the page automatically splits them into Upcoming and Past using
   the date, so ordering is not critical.

   FIELDS:
     type    : "Webinar" | "Workshop" | "Guest Lecture" | "Announcement"
               (any short label is fine \u2014 it shows as a small tag)
     title   : the event / talk title
     speaker : presenter name & affiliation   (use "" if not applicable)
     date    : MUST be "YYYY-MM-DD"  e.g. "2026-07-15"
               This is how the page decides Upcoming vs Past, so keep
               the format exact.
     time    : human-friendly time, shown to visitors
               e.g. "2:00 \u2013 3:30 PM AEST"   (use "" if none)
     location: "Online (Zoom)" | "Room 2.1, CIHE Sydney" | etc.
     topics  : a list of short bullet points  ["...", "...", "..."]
               (use [] for none)
     link    : the meeting / webinar / registration URL people click to
               join or register. Leave "" if not available yet \u2014 the
               page will simply hide the button.
     linkText: the button label. e.g. "Join Webinar", "Register",
               "Meeting Link", "View Recording". Defaults sensibly if "".
   ===================================================================== */

const EVENTS = [
  {
    type: "Webinar",
    title: "Adversarial Machine Learning in Intrusion Detection",
    speaker: "Dr Ashraf Uddin, Secure Intelligence Lab",
    date: "2026-07-15",
    time: "2:00 \u2013 3:30 PM AEST",
    location: "Online (Zoom)",
    topics: [
      "How attackers evade ML-based intrusion detection systems",
      "Defensive techniques and robust model design",
      "Live demo and Q&A"
    ],
    link: "",
    linkText: "Register"
  },
  {
    type: "Guest Lecture",
    title: "Privacy-Preserving Blockchain for Healthcare",
    speaker: "Invited Speaker (TBC)",
    date: "2026-08-05",
    time: "11:00 AM \u2013 12:00 PM AEST",
    location: "Room 2.1, CIHE Sydney + Online",
    topics: [
      "Zero-knowledge proofs in practice",
      "Pharmaceutical traceability case study",
      "Open discussion"
    ],
    link: "",
    linkText: "Meeting Link"
  },
  {
    type: "Workshop",
    title: "Hands-On Deep Learning for Cybersecurity",
    speaker: "Alamin Talukder & Dr Nam Hoai Chu",
    date: "2026-04-18",
    time: "10:00 AM \u2013 1:00 PM AEST",
    location: "CIHE Sydney",
    topics: [
      "Building a deep-learning classifier for network traffic",
      "Practical model evaluation",
      "Dataset preparation walkthrough"
    ],
    link: "",
    linkText: "View Materials"
  }
];
