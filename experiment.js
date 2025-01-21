console.log("experiment.js is running!");

/*********************************************
 * 1) Helper Functions
 *********************************************/

// Evaluate attention checks, if any
function evalAttentionChecks() {
  let attn_data = jsPsych.data.get().filter({ trial_id: "attention_check" }).values();
  if (attn_data.length === 0) return 1;
  let checks_passed = 0;
  for (let item of attn_data) {
    if (item.correct === true) checks_passed++;
  }
  return checks_passed / attn_data.length;
}

// Assess performance at the end
function assessPerformance() {
  let exp_data = jsPsych.data.get().filter({ trial_id: "stim" }).values();
  let missed_count = 0;
  let trial_count = 0;
  let rt_array = [];

  for (let d of exp_data) {
    trial_count++;
    if (d.rt == null) missed_count++;
    else rt_array.push(d.rt);
  }

  rt_array.sort((a,b) => a-b);
  let avg_rt = -1;
  if (rt_array.length > 0) {
    let mid = Math.floor(rt_array.length/2);
    if (rt_array.length % 2 === 1) {
      avg_rt = rt_array[mid];
    } else {
      avg_rt = (rt_array[mid-1] + rt_array[mid]) / 2;
    }
  }

  let missed_percent = missed_count / trial_count;
  let credit_var = (missed_percent < 0.4 && avg_rt > 200);

  // if you're picking a random bonus from bonus_list
  let bonus = randomDraw(bonus_list);
  jsPsych.data.addProperties({
    credit_var: credit_var,
    bonus_var: bonus
  });
}

// Generate random draws
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

// Utility: fillArray, randomDraw
function fillArray(value, len) {
  let arr = [];
  for (let i=0; i<len; i++) {
    for (let j=0; j<value.length; j++) {
      arr.push(value[j]);
    }
  }
  return arr;
}
function randomDraw(lst) {
  let index = Math.floor(Math.random() * lst.length);
  return lst[index];
}

/*********************************************
 * 2) Define Task/Global Variables
 *********************************************/
let bonus_list = [];

// Generate 36 random smaller amounts
let small_amts = [];
for (let i=0; i<36; i++) {
  let val = Math.round(rnorm(200000,100000)*100)/100;
  if (val < 50000) val = 50000;
  if (val > 400000) val = 400000;
  small_amts.push(val);
}

// Relative differences
let rel_dif = fillArray([1.01,1.05,1.10,1.15,1.20,1.25,1.30,1.50,1.75],4);

// Larger amounts
let larger_amts = [];
for (let i=0; i<36; i++) {
  let val = Math.round(small_amts[i] * rel_dif[i] *100)/100;
  larger_amts.push(val);
}

// Delays
let sooner_dels = fillArray(["hari ini"],18).concat(fillArray(["2 minggu lagi"],18));
let later_dels = fillArray(["2 minggu lagi"],9)
  .concat(fillArray(["4 minggu lagi"],18))
  .concat(fillArray(["6 minggu lagi"],9));

// Build 36 test trials
let trials = [];
for (let i=0; i<36; i++) {
  trials.push({
    stimulus: `
      <div class="centerbox" id="container">
        <p class="center-block-text">Pilih option mana yang kamu mau:</p>
        <div class="table">
          <div class="row">
            <div id="option">
              <center><font color='green'>$${small_amts[i]}<br>${sooner_dels[i]}</font></center>
            </div>
            <div id="option">
              <center><font color='green'>$${larger_amts[i]}<br>${later_dels[i]}</font></center>
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
 * 3) Initialize jsPsych
 *********************************************/
const jsPsych = initJsPsych({
  on_finish: function() {
    console.log("Experiment finished.");
  }
});

/*********************************************
 * 4) Instruction / Practice / Test Blocks
 *********************************************/

// 4a) Intro text with single button
let feedback_instruct_text = 
  'Selamat datang. Eksperimen ini dapat diselesaikan dalam ±5 menit. ' +
  'Silakan klik "Mulai" untuk memulai.';

function getInstructFeedback() {
  return `
    <div class='centerbox'>
      <p class='center-block-text'>${feedback_instruct_text}</p>
    </div>
  `;
}

let feedback_instruct_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: getInstructFeedback(),
  choices: ["Mulai"], // single button
  data: { trial_id: "instruction" }
};

// 4b) Detailed instructions (multi-page or single-page)
let instructions_block = {
  type: jsPsychInstructions,
  pages: [
    `<div class='centerbox'>
       <p class='block-text'>
         Dalam eksperimen ini, kamu akan diberi dua nominal uang yang bisa kamu pilih.
         Kedua nominal tersedia pada waktu yang berbeda. 
       </p>
       <p class='block-text'>
         Klik salah satu tombol untuk memilih. 
         You should indicate your <strong>true</strong> preference because a random trial
         will be chosen for a bonus payment at the end.
       </p>
     </div>`
  ],
  show_clickable_nav: true,
  button_label_next: "Lanjut",
  data: { trial_id: "instruction" }
};

// 4c) Practice Intro (single button)
let start_practice_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Berikut contoh trial. Jawaban di trial ini tidak akan masuk bonus.
      </p>
    </div>
  `,
  choices: ["Mulai Practice"],
  data: { trial_id: "practice_intro" }
};

// 4d) Practice trial with 2 clickable buttons
let practice_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="centerbox" id="container">
      <p class='center-block-text'>Pilih option mana yang kamu mau:</p>
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
  choices: ["Option 1","Option 2"],
  data: {
    trial_id: "stim",
    exp_stage: "practice",
    smaller_amount: 20.58,
    sooner_delay: "today",
    larger_amount: 25.93,
    later_delay: "2 weeks"
  },
  on_finish: function(data) {
    // data.response = 0 if "Option 1" clicked, 1 if "Option 2"
    let btnIndex = data.response;
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

// 4e) Start Test block
let start_test_block = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Sekarang kita mulai ke survey utama.
      </p>
    </div>
  `,
  choices: ["Mulai Survey"],
  data: { trial_id: "test_intro" }
};

// 4f) Main test (36 trials) -> 2 clickable buttons
let test_block = {
  timeline: trials.map(t => {
    return {
      type: jsPsychHtmlButtonResponse,
      stimulus: t.stimulus,
      choices: ["Option 1","Option 2"],
      data: t.data,
      on_finish: function(d) {
        let btn = d.response; 
        let chosen_amount = 0;
        let chosen_delay = '';
        let choice = '';
        if (btn === 0) {
          chosen_amount = d.smaller_amount;
          chosen_delay = d.sooner_delay;
          choice = 'smaller_sooner';
        } else if (btn === 1) {
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

// 4g) Post-task survey
let post_task_block = {
  type: jsPsychSurveyText,
  questions: [
    { prompt: 'Jelaskan menurut kamu apa yang kamu kerjakan tadi.', rows: 5, columns: 60 },
    { prompt: 'Ada masukan untuk tes ini?', rows: 5, columns: 60 }
  ],
  data: { exp_id: "discount_titrate", trial_id: "post_task_questions" }
};

// 4h) End block -> single button
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
    // Evaluate or record performance
    assessPerformance();

    // Send data to your Google sheet
    let experimentData = jsPsych.data.get().json();
    fetch("https://script.google.com/macros/s/AKfycbw0ZssxsytYWrE_aeTnUVlsAZzYDhYEvPndLexLA5gV0gjkP_YwjPWQHJwqsswg3GbW-g/exec", {
      method: 'POST',
      mode: "no-cors",
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
