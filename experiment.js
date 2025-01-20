console.log("experiment.js is running!");

// -----------------------------------------
// Helper Functions (unchanged)
// -----------------------------------------
function evalAttentionChecks() {
  /* ... no changes needed ... */
}
function assessPerformance() {
  /* ... no changes needed ... */
}
function getInstructFeedback() {
  return `<div class='centerbox'>
            <p class='center-block-text'>${feedback_instruct_text}</p>
          </div>`;
}
/* rnorm, fillArray, randomDraw, etc. remain the same */

// -----------------------------------------
// Global/Task Variables
// -----------------------------------------
let bonus_list = [];
let small_amts = [];
// ... rest of the code generating amounts, etc. remains ...

// -----------------------------------------
// Build Trials (but no longer mention 'q'/'p')
// -----------------------------------------
let trials = [];
for (let i = 0; i < 36; i++) {
  trials.push({
    // We'll show the same HTML, but we won't instruct them to press 'q'/'p'.
    // Instead, we will create the response as two on-screen buttons:
    // "Option A" and "Option B".
    stimulus: `
      <div class="centerbox" id="container">
        <p class="center-block-text">
          Pilih dari dua pilihan ini yang kamu mau.
        </p>
        <div class="table">
          <div class="row">
            <div id="option">
              <center>
                <font color='green'>Rp${small_amts[i]}<br>${sooner_dels[i]}</font>
              </center>
            </div>
            <div id="option">
              <center>
                <font color='green'>Rp${larger_amts[i]}<br>${later_dels[i]}</font>
              </center>
            </div>
          </div>
        </div>
      </div>
    `,
    data: {
      trial_id: "stim",
      exp_stage: "test",
      smaller_amount: small_amts[i],
      sooner_delay: sooner_dels[i],
      larger_amount: larger_amts[i],
      later_delay: later_dels[i]
    }
  });
}

// -----------------------------------------
// Initialize jsPsych
// -----------------------------------------
const jsPsych = initJsPsych({
  on_finish: function() {
    console.log("Experiment finished.");
  }
});

// -----------------------------------------
// Instruction & Feedback Text
// -----------------------------------------
let feedback_instruct_text = 
  'Selamat datang. Eksperimen ini dapat diselesaikan dalam ±5 menit. Klik tombol di bawah untuk memulai.';

// -----------------------------------------
// Convert "Enter" screens to Button Screens
// -----------------------------------------

// Instead of jsPsychHtmlKeyboardResponse, we’ll use jsPsychHtmlButtonResponse
// with a single button labeled "Lanjut" (or "Continue").

let feedback_instruct_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: getInstructFeedback(),
  choices: ["Mulai"], // Single button labeled "Mulai"
  data: { trial_id: 'instruction' }
};

let instructions_block = {
  // We can keep jsPsychInstructions if you want multiple pages
  // (it already uses clickable buttons like "Next" by default).
  type: jsPsychInstructions,
  pages: [
    `<div class='centerbox'>
       <p class='block-text'>
         Dalam eksperimen ini, kamu akan diberi dua nominal uang...
         <br><br>
         Kamu akan memilih dengan mengklik tombol di layar.
       </p>
       <p class='block-text'>
         You should indicate your <strong>true</strong> preference...
       </p>
     </div>`
  ],
  show_clickable_nav: true,
  data: { trial_id: 'instruction' }
};

let start_practice_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Here is a sample trial. Your choice here will NOT be included in your bonus.
      </p>
    </div>
  `,
  choices: ["Begin Practice"],
  data: { trial_id: "practice_intro" }
};

// Practice trial, also button-based
// We'll show 2 buttons: "Left Option" / "Right Option"
let practice_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="centerbox" id="container">
      <p class='center-block-text'>
        Please select the option you would prefer:
      </p>
      <div class="table">
        <div class="row">
          <div id="option">
            <center><font color='green'>$20.58<br>today</font></center>
          </div>
          <div id="option">
            <center><font color='green'>$25.93<br>2 weeks</font></center>
          </div>
        </div>
      </div>
    </div>
  `,
  // We have two buttons: 'Option 1' and 'Option 2'
  choices: ["Option 1", "Option 2"],
  data: {
    trial_id: "stim",
    exp_stage: "practice",
    smaller_amount: 20.58,
    sooner_delay: "today",
    larger_amount: 25.93,
    later_delay: "2 weeks"
  },
  on_finish: function(data) {
    // data.response is 0 if first button clicked, 1 if second
    let whichButton = data.response;
    let chosen_amount = null;
    let chosen_delay = null;
    let choice = '';

    if (whichButton === 0) { // left button clicked
      chosen_amount = data.smaller_amount;
      chosen_delay = data.sooner_delay;
      choice = 'smaller_sooner';
    } else if (whichButton === 1) {
      chosen_amount = data.larger_amount;
      chosen_delay = data.later_delay;
      choice = 'larger_later';
    }

    data.chosen_amount = chosen_amount;
    data.chosen_delay = chosen_delay;
    data.choice = choice;
  }
};

let start_test_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        You are now ready to begin the main survey.
      </p>
      <p class='center-block-text'>
        Remember to indicate your <strong>true</strong> preferences.
      </p>
    </div>
  `,
  choices: ["Begin Main Task"],
  data: { trial_id: "test_intro" }
};

// -----------------------------------------
// Main test (36 trials) -> 2 on-screen buttons
// We'll transform the "timeline" approach:
let test_block = {
  timeline: trials.map(t => {
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: t.stimulus,
      // 2 button choices => "Option 1" (left) and "Option 2" (right)
      choices: ["Option 1", "Option 2"],
      data: t.data,
      on_finish: function(d) {
        let whichButton = d.response;
        let chosen_amount = 0;
        let chosen_delay = 0;
        let choice = '';
        if (whichButton === 0) { // left
          chosen_amount = d.smaller_amount;
          chosen_delay = d.sooner_delay;
          choice = 'smaller_sooner';
        } else if (whichButton === 1) { // right
          chosen_amount = d.larger_amount;
          chosen_delay = d.later_delay;
          choice = 'larger_later';
        }
        bonus_list.push({ amount: chosen_amount, delay: chosen_delay });
        d.chosen_amount = chosen_amount;
        d.chosen_delay = chosen_delay;
        d.choice = choice;
      }
    };
  }),
  randomize_order: true
};

// -----------------------------------------
// Post-task survey (unchanged, uses survey-text)
let post_task_block = {
  type: jsPsychSurveyText,
  questions: [
    { prompt: 'Jelaskan menurut kamu apa yang kamu kerjakan tadi.', rows: 5, columns: 60 },
    { prompt: 'Ada masukan untuk tes ini?', rows: 5, columns: 60 }
  ],
  data: { exp_id: "discount_titrate", trial_id: "post_task_questions" }
};

// -----------------------------------------
// End block -> single button
let end_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>Thanks for completing this task!</p>
      <p class='center-block-text'>Click "Finish" to submit your data.</p>
    </div>
  `,
  choices: ["Finish"],
  data: { trial_id: "end", exp_id: "discount_titrate" },
  on_finish: function() {
    // Evaluate or record performance
    assessPerformance();
    let experimentData = jsPsych.data.get().json();
    fetch("https://script.google.com/macros/s/AKfycbyTxDcv470x2k-1IZsmA2pUwsD3-QVsw7ynMI2qD0-iMXv_wGC9E3B1xoLvalLXh6-__Q/exec", {
      method: 'POST',
      body: experimentData,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log("Data successfully sent to Google Sheets!");
    })
    .catch(error => {
      console.error("Error sending data:", error);
    });
  }
};

// -----------------------------------------
// Build the final timeline & run
let timeline = [];
timeline.push(feedback_instruct_block);
timeline.push(instructions_block);
timeline.push(start_practice_block);
timeline.push(practice_block);
timeline.push(start_test_block);
timeline.push(test_block);
// if run_attention_checks, push attention-check block
timeline.push(post_task_block);
timeline.push(end_block);

jsPsych.run(timeline);
