/*********************************************
 * experiment.js 
 *********************************************/
console.log("experiment.js is running!");

/*********************************************
 * 1) Helper Functions
 *********************************************/

/** Box-Muller transform for normal random draws */
function rnorm(mean=0, stdev=1) {
  let u1, u2, v1, v2, s;
  if (rnorm.v2 === null) {
    do {
      u1 = Math.random();
      u2 = Math.random();
      v1 = 2 * u1 - 1;
      v2 = 2 * u2 - 1;
      s = v1*v1 + v2*v2;
    } while(s === 0 || s >= 1);
    rnorm.v2 = v2 * Math.sqrt(-2 * Math.log(s) / s);
    return stdev * v1 * Math.sqrt(-2 * Math.log(s) / s) + mean;
  }
  v2 = rnorm.v2;
  rnorm.v2 = null;
  return stdev * v2 + mean;
}
rnorm.v2 = null;

/** Duplicate array items N times */
function fillArray(value, len) {
  let arr = [];
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < value.length; j++) {
      arr.push(value[j]);
    }
  }
  return arr;
}

/** Pick a random element from an array */
function randomDraw(lst) {
  let index = Math.floor(Math.random() * lst.length);
  return lst[index];
}

/** Format a number in Indonesian style: e.g. 1.000,00 */
function formatIDR(amount) {
  // Force 2 decimals
  let fixed = amount.toFixed(2);
  let parts = fixed.split('.');
  let intPart = parts[0];
  let fracPart = parts[1];

  // Insert '.' every 3 digits from right
  let reversed = intPart.split('').reverse();
  let withDots = [];
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) {
      withDots.push('.');
    }
    withDots.push(reversed[i]);
  }
  let finalInt = withDots.reverse().join('');

  return finalInt + ',' + fracPart;
}

/*********************************************
 * 2) Evaluate Attention Checks & Performance
 *********************************************/
function evalAttentionChecks() {
  // If you have specific 'attention_check' trials
  let attn_data = jsPsych.data.get().filter({ trial_id: "attention_check" }).values();
  if (attn_data.length === 0) return 1; 
  let checks_passed = 0;
  for (let i=0; i<attn_data.length; i++){
    if (attn_data[i].correct === true) checks_passed += 1;
  }
  return checks_passed / attn_data.length;
}

function assessPerformance() {
  // Filter trials with trial_id == "stim"
  let exp_data = jsPsych.data.get().filter({ trial_id: "stim" }).values();
  let missed_count = 0;
  let trial_count = 0;
  let rt_array = [];
  let choice_counts = {};

  for (let d of exp_data) {
    // if it used possible_responses != 'none' (not strictly needed here)
    trial_count += 1;
    if (d.rt == null) {
      missed_count += 1;
    } else {
      rt_array.push(d.rt);
    }
    let response = d.response;
    if (!choice_counts[response]) choice_counts[response] = 0;
    choice_counts[response]++;
  }

  rt_array.sort((a,b)=>a-b);
  let avg_rt = -1;
  if (rt_array.length > 0) {
    let mid = Math.floor(rt_array.length / 2);
    if (rt_array.length % 2 === 1) {
      avg_rt = rt_array[mid];
    } else {
      avg_rt = (rt_array[mid-1] + rt_array[mid]) / 2;
    }
  }

  let missed_percent = missed_count / trial_count;
  let credit_var = (missed_percent < 0.4 && avg_rt > 200);

  // If you want to track a random bonus from the chosen list
  let bonus = randomDraw(bonus_list);
  jsPsych.data.addProperties({
    credit_var: credit_var,
    bonus_var: bonus
  });
}

/*********************************************
 * 3) Define Task Variables
 *********************************************/
let bonus_list = [];

// Generate 36 random smaller amounts (200k ± 100k, clipped 50k..400k)
let small_amts = [];
for (let i = 0; i < 36; i++) {
  let val = Math.round(rnorm(200000, 100000)); 
  if (val < 50000) val = 50000;
  if (val > 400000) val = 400000;
  small_amts.push(val);
}

// Relative differences
let rel_dif = fillArray([1.01, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.50, 1.75], 4);

// Larger amounts
let larger_amts = [];
for (let i = 0; i < 36; i++) {
  let val = Math.round(small_amts[i] * rel_dif[i]);
  larger_amts.push(val);
}

// Delays
let sooner_dels = fillArray(["hari ini"], 18).concat(fillArray(["2 minggu lagi"], 18));
let later_dels  = fillArray(["2 minggu lagi"], 9)
  .concat(fillArray(["4 minggu lagi"], 18))
  .concat(fillArray(["6 minggu lagi"], 9));

// Build 36 test trials
let trials = [];
for (let i = 0; i < 36; i++) {
  trials.push({
    stimulus: `
      <div class="centerbox" id="container">
        <p class="center-block-text">
          Pilih dari dua pilihan ini yang kamu mau:
        </p>
        <div class="table">
          <div class="row">
            <div id="option">
              <center>
                <font color='green'>Rp${formatIDR(small_amts[i])}<br>${sooner_dels[i]}</font>
              </center>
            </div>
            <div id="option">
              <center>
                <font color='green'>Rp${formatIDR(larger_amts[i])}<br>${later_dels[i]}</font>
              </center>
            </div>
          </div>
        </div>
      </div>
    `,
    data: {
      trial_id: "stim",
      smaller_amount: small_amts[i],
      sooner_delay: sooner_dels[i],
      larger_amount: larger_amts[i],
      later_delay: later_dels[i]
    }
  });
}

/*********************************************
 * 4) Initialize jsPsych
 *********************************************/
const jsPsych = initJsPsych({
  on_finish: function() {
    console.log("Experiment finished.");
  }
});

/*********************************************
 * 5) Instruction / Practice / Test Blocks
 *********************************************/

// 5a) Intro text (single button)
let feedback_instruct_text = 
  'Selamat datang. Eksperimen ini dapat diselesaikan dalam ±5 menit. Silakan klik "Mulai" untuk memulai.';

function getInstructFeedback() {
  return `
    <div class='centerbox'>
      <p class='center-block-text'>
        ${feedback_instruct_text}
      </p>
    </div>
  `;
}

let feedback_instruct_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: getInstructFeedback(),
  choices: ["Mulai"],
  data: { trial_id: "instruction" }
};

// 5b) Detailed instructions (jsPsychInstructions plugin, has clickable next button)
let instructions_block = {
  type: jsPsychInstructions,
  pages: [
    `<div class='centerbox'>
       <p class='block-text'>
         Dalam eksperimen ini, kamu akan diberi dua nominal uang yang bisa kamu pilih. 
         Kedua nominal tersedia di waktu yang berbeda. 
         <br><br>
         Klik tombol di bawah untuk memilih option yang kamu inginkan.
       </p>
       <p class='block-text'>
         You should indicate your <strong>true</strong> preference because at the end,
         a random trial will be chosen for a bonus payment.
       </p>
     </div>`
  ],
  show_clickable_nav: true,
  data: { trial_id: "instruction" }
};

// 5c) Practice Intro
let start_practice_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Berikut contoh trial. Jawaban di trial ini tidak masuk bonus.
      </p>
    </div>
  `,
  choices: ["Lanjut ke Practice"],
  data: { trial_id: "practice_intro" }
};

// 5d) Practice trial with 2 clickable buttons
let practice_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="centerbox" id="container">
      <p class='center-block-text'>
        Pilih option mana yang kamu mau:
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
  choices: ["Option 1", "Option 2"],
  data: {
    trial_id: "stim",
    exp_stage: "practice",
    smaller_amount: 20580,
    sooner_delay: "today",
    larger_amount: 25930,
    later_delay: "2 weeks"
  },
  on_finish: function(data) {
    let btnIndex = data.response; // 0 for Option 1, 1 for Option 2
    let chosen_amount, chosen_delay, choice;
    if (btnIndex === 0) {
      chosen_amount = data.smaller_amount;
      chosen_delay = data.sooner_delay;
      choice = 'smaller_sooner';
    } else {
      chosen_amount = data.larger_amount;
      chosen_delay = data.later_delay;
      choice = 'larger_later';
    }
    data.chosen_amount = chosen_amount;
    data.chosen_delay = chosen_delay;
    data.choice = choice;
  }
};

// 5e) Start Test button
let start_test_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Sekarang siap untuk memulai survey utama.
      </p>
      <p class='center-block-text'>
        Pilih secara benar agar bonus kamu maksimal.
      </p>
    </div>
  `,
  choices: ["Mulai Survey"],
  data: { trial_id: "test_intro" }
};

// 5f) Main test (36 trials) -> 2 clickable buttons
let test_block = {
  timeline: trials.map(t => {
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: t.stimulus,
      choices: ["Option 1", "Option 2"],
      data: t.data,
      on_finish: function(d) {
        let btn = d.response; // 0 or 1
        let chosen_amount = 0;
        let chosen_delay = '';
        let choice = '';
        if (btn === 0) {
          chosen_amount = d.smaller_amount;
          chosen_delay = d.sooner_delay;
          choice = 'smaller_sooner';
        } else {
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

/*********************************************
 * 6) Post-Task Survey & End Block
 *********************************************/
let post_task_block = {
  type: jsPsychSurveyText,
  questions: [
    { prompt: 'Jelaskan apa yang baru saja kamu kerjakan?', rows: 5, columns: 60 },
    { prompt: 'Ada saran atau masukan untuk tes ini?', rows: 5, columns: 60 }
  ],
  data: { exp_id: "discount_titrate", trial_id: "post_task_questions" }
};

let end_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Terima kasih telah menyelesaikan tugas ini!
      </p>
      <p class='center-block-text'>
        Klik "Selesai" untuk submit data.
      </p>
    </div>
  `,
  choices: ["Selesai"],
  data: { trial_id: "end" },
  on_finish: function() {
    assessPerformance();

    // Send data to your Google sheet
    let experimentData = jsPsych.data.get().json();
    fetch("https://script.google.com/macros/s/YOUR-GOOGLE-APPS-SCRIPT-ID/exec", {
      method: 'POST',
      body: experimentData,
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
      console.log("Data successfully sent to Google Sheets!");
    })
    .catch(error => {
      console.error("Error sending data:", error);
    });
  }
};

/*********************************************
 * 7) Build Timeline & Run
 *********************************************/
let timeline = [];
timeline.push(feedback_instruct_block);
timeline.push(instructions_block);
timeline.push(start_practice_block);
timeline.push(practice_block);
timeline.push(start_test_block);
timeline.push(test_block);
timeline.push(post_task_block);
timeline.push(end_block);

jsPsych.run(timeline);
