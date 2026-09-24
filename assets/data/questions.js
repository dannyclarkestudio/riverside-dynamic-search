// QUESTIONS. The finder flow, one question per screen.
//
// `showIf` is an optional condition: the question is only asked when every listed
// answer matches (the same shape as a rule's `when`). If an earlier answer changes
// so that a question no longer applies, its answer is discarded.
//
// Every question has a "not sure" or "no preference" answer (value "unsure").
// It is a first-class answer and never eliminates a property.
//
// `type: "dates"` is answered with an arrival date and a number of nights
// rather than a tile (the value becomes "dates" and the dates ride alongside);
// `multiple: true` lets the guest pick several tiles (the answer is an array).

window.RR_QUESTIONS = [
  {
    id: "party",
    label: "Who's coming",
    question: "Who's coming on the trip?",
    help: "Pick the closest match. You can refine your answers at the end.",
    options: [
      { value: "couple", label: "Just the two of us", icon: "couple" },
      { value: "family", label: "Family with children", icon: "family" },
      { value: "friends", label: "A group of friends", icon: "friends" },
      { value: "group", label: "A big get-together", icon: "group" },
      { value: "solo", label: "Just me", icon: "solo" },
      { value: "unsure", label: "Not settled yet", icon: "question" }
    ]
  },
  {
    id: "size",
    label: "How many",
    question: "How many of you will there be?",
    help: "Count everyone who needs a bed. We only show cottages with room for you all.",
    showIf: { party: ["family", "friends", "group", "unsure"] },
    options: [
      { value: "3-4", label: "3 or 4", icon: "n4" },
      { value: "5-6", label: "5 or 6", icon: "n6" },
      { value: "7-8", label: "7 or 8", icon: "n8" },
      { value: "9-12", label: "9 to 12", icon: "n12" },
      { value: "13+", label: "13 or more", icon: "n16" },
      { value: "unsure", label: "Not sure yet", icon: "question" }
    ]
  },
  {
    id: "area",
    label: "Where",
    question: "Where on the Broads would you like to be?",
    help: "Our cottages run from Wroxham down to Reedham. Anywhere is a fine answer.",
    options: [
      { value: "wroxham", label: "Wroxham and Hoveton", icon: "pin" },
      { value: "horning", label: "Horning", icon: "pin" },
      { value: "thurne", label: "Potter Heigham and the Thurne", icon: "pin" },
      { value: "south", label: "Reedham, Brundall and the Yare", icon: "pin" },
      { value: "quiet", label: "Somewhere quiet and rural", icon: "tree" },
      { value: "unsure", label: "Anywhere on the Broads", icon: "question" }
    ]
  },
  {
    id: "when",
    label: "Dates",
    type: "dates",
    question: "When would you like to come?",
    help: "Pick an arrival date and we'll check which cottages are free. Or keep it open for now.",
    unsureIsPreference: true,
    options: [
      { value: "dates", label: "Specific dates", icon: "calendar" },
      { value: "unsure", label: "I'm flexible", icon: "question" }
    ]
  },
  {
    id: "musthave",
    label: "Must have",
    multiple: true,
    question: "What can't you do without?",
    help: "Choose as many as you like. Dogs are a hard rule; the rest steer the list.",
    options: [
      { value: "dog", label: "The dog comes too", icon: "dog" },
      { value: "moorings", label: "A mooring for our boat", icon: "anchor" },
      { value: "single", label: "Everything on one level", icon: "single" },
      { value: "hottub", label: "A hot tub", icon: "hottub" },
      { value: "river", label: "A river view", icon: "river" },
      { value: "unsure", label: "No must-haves", icon: "question" }
    ]
  },
  {
    id: "trip",
    label: "Your time",
    multiple: true,
    question: "How do you want to spend your time?",
    help: "Choose as many as you like.",
    options: [
      { value: "boating", label: "Out on the water", icon: "boat" },
      { value: "fishing", label: "Fishing", icon: "fish" },
      { value: "walking", label: "Walking and wildlife", icon: "walk" },
      { value: "exploring", label: "Pubs, villages and days out", icon: "explore" },
      { value: "nothing", label: "Doing very little", icon: "rest" },
      { value: "unsure", label: "A bit of everything", icon: "question" }
    ]
  }
];
