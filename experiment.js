// experiment.js
console.log("experiment.js is running!");

// *********************************************
// Helper Functions
// *********************************************
function evalAttentionChecks() {
  let checks_passed = 0;
  let attn_data = jsPsych.data.get().filter({trial_id: "attention_check"}).values();
  if(attn_data.length === 0){
    return 1; // no checks were run
  }
  for(let i=0; i<attn_data.length; i++){
    if(attn_data[i].correct === true) {
      checks_passed += 1;
    }
  }
  return checks_passed / attn_data.length;
}

function assessPerformance() {
  let experiment_data = jsPsych.data.get().filter({trial_id: "stim"}).values();
  let missed_count = 0;
  let trial_count = 0;
  let rt_array = [];

  let choice_counts = { "-1": 0, "q": 0, "p": 0 };
  
  for(let i=0; i<experiment_data.length; i++){
    if(experiment_data[i].possible_responses !== 'none'){
      trial_count += 1;
      let rt = experiment_data[i].rt;
      let key = experiment_data[i].response; 
      
      choice_counts[key] = (choice_counts[key] !== undefined) ? choice_counts[key] + 1 : 1;
      if(rt === null){
        missed_count += 1;
      } else {
        rt_array.push(rt);
      }
    }
  }
  
  rt_array.sort((a, b) => a - b);
  let avg_rt = -1;
  if(rt_array.length > 0){
    let mid = Math.floor(rt_array.length / 2);
    if(rt_array.length % 2 === 1){
      avg_rt = rt_array[mid];
    } else {
      avg_rt = (rt_array[mid - 1] + rt_array[mid]) / 2;
    }
  }

  let missed_percent = missed_count / trial_count;
  let credit_var = (missed_percent < 0.4 && avg_rt > 200);

  let bonus = randomDraw(bonus_list);
  
  jsPsych.data.addProperties({
    credit_var: credit_var,
    bonus_var: bonus
  });
}

function getInstructFeedback() {
  return `<div class='centerbox'>
            <p class='center-block-text'>${feedback_instruct_text}</p>
          </div>`;
}

// Box-Muller for normal random draws
function rnorm(mean=0, stdev=1) {
  let u1, u2, v1, v2, s;
  if(rnorm.v2 === null) {
    do {
      u1 = Math.random();
      u2 = Math.random();
      v1 = 2*u1 - 1;
      v2 = 2*u2 - 1;
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

function fillArray(value, len) {
  let arr = [];
  for(let i = 0; i < len; i++) {
    for(let j = 0; j < value.length; j++){
      arr.push(value[j]);
    }
  }
  return arr;
}

function randomDraw(lst) {
  let index = Math.floor(Math.random() * lst.length);
  return lst[index];
}

// *********************************************
// Define Global/Task Variables
// *********************************************
let run_attention_checks = false;
let attention_check_thresh = 0.65;
let sumInstructTime = 0;
let instructTimeThresh = 0;
let credit_var = true;

let choices = ['q','p'];
let bonus_list = [];

// generate smaller amounts
let small_amts = [];
for(let i = 0; i < 36; i++) {
  small_amts[i] = Math.round(rnorm(200000, 100000) * 100)/100;
  if(small_amts[i] < 50000){
    small_amts[i] = 50000;
  }
  if(small_amts[i] > 400000){
    small_amts[i] = 400000;
  }
}

// relative differences
let rel_dif = fillArray([1.01, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.50, 1.75], 4);
let larger_amts = [];
for(let i = 0; i < 36; i++){
  larger_amts[i] = Math.round(small_amts[i] * rel_dif[i] * 100)/100;
}

// sooner delays
let sooner_dels = fillArray(["hari ini"], 18).concat(fillArray(["2 minggu lagi"], 18));
// later delays
let later_dels = fillArray(["2 minggu lagi"], 9)
                .concat(fillArray(["4 minggu lagi"], 18))
                .concat(fillArray(["6 minggu lagi"], 9));

let trials = [];
for(let i = 0; i < 36; i++){
  trials.push({
    stimulus: `
      <div class="centerbox" id="container">
        <p class="center-block-text">
          Pilih dari dua pilihan ini yang kamu mau. 
          Tekan <strong>'q'</strong> untuk kiri dan <strong>'p'</strong> untuk kanan:
        </p>
        <div class="table">
          <div class="row">
            <div id="option">
              <center><font color='green'>Rp${small_amts[i]}<br>${sooner_dels[i]}</font></center>
            </div>
            <div id="option">
              <center><font color='green'>Rp${larger_amts[i]}<br>${later_dels[i]}</font></center>
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

// *********************************************
// Initialize jsPsych
// *********************************************
const jsPsych = initJsPsych({
  show_progress_bar: false,
  on_finish: function(){
    console.log("Experiment finished.");
  }
});

// Instruction & Feedback
let feedback_instruct_text =
  'Selamat datang. Eksperimen ini dapat diselesaikan dalam ±5 menit. Tekan <strong>Enter</strong> untuk memulai.';

let feedback_instruct_block = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: getInstructFeedback,
  choices: ['Enter'], 
  data: { trial_id: 'instruction' }
};

let instructions_block = {
  type: jsPsychInstructions,
  pages: [
    `<div class='centerbox'>
       <p class='block-text'>
         Dalam eksperimen ini, kamu akan diberi dua nominal uang yang bisa kamu pilih. 
         Kedua nominal tersebut akan tersedia pada waktu yang berbeda. 
         Tugasmu adalah menekan tombol <strong>"q"</strong> untuk pilihan kiri 
         dan <strong>"p"</strong> untuk pilihan kanan.
       </p>
       <p class='block-text'>
         You should indicate your <strong>true</strong> preference because at the end 
         a random trial will be chosen and you will receive a bonus payment 
         proportional to your chosen option (and its delay).
       </p>
     </div>`
  ],
  show_clickable_nav: true,
  data: { trial_id: 'instruction' }
};

let start_practice_block = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        Here is a sample trial. Your choice here will NOT be included in your bonus.
      </p>
      <p class='center-block-text'>Press <strong>Enter</strong> to begin.</p>
    </div>
  `,
  choices: ['Enter'],
  data: { trial_id: "practice_intro" }
};

let practice_block = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class="centerbox" id="container">
      <p class='center-block-text'>
        Please select the option you would prefer. 
        Press <strong>'q'</strong> for left, <strong>'p'</strong> for right:
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
  choices: ['q', 'p'],
  data: {
    trial_id: "stim",
    exp_stage: "practice",
    smaller_amount: 20.58,
    sooner_delay: "today",
    larger_amount: 25.93,
    later_delay: "2 weeks"
  },
  on_finish: function(data) {
    let whichKey = data.response;
    let chosen_amount = null;
    let chosen_delay = null;
    let choice = '';
    if(whichKey === 'q'){
      chosen_amount = data.smaller_amount;
      chosen_delay = data.sooner_delay;
      choice = 'smaller_sooner';
    } else if(whichKey === 'p'){
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
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>
        You are now ready to begin the main survey.
      </p>
      <p class='center-block-text'>
        Remember to indicate your <strong>true</strong> preferences.
      </p>
      <p class='center-block-text'>
        Press <strong>Enter</strong> to begin.
      </p>
    </div>
  `,
  choices: ['Enter'],
  data: { trial_id: "test_intro" }
};

// main test
let test_block = {
  timeline: trials.map(t => {
    return {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: t.stimulus,
      choices: ['q', 'p'],
      data: t.data,
      on_finish: function(d){
        let whichKey = d.response;
        let chosen_amount = 0;
        let chosen_delay = 0;
        let choice = '';
        if(whichKey === 'q'){
          chosen_amount = d.smaller_amount;
          chosen_delay = d.sooner_delay;
          choice = 'smaller_sooner';
        } else if(whichKey === 'p'){
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

let post_task_block = {
  type: jsPsychSurveyText,
  questions: [
    { prompt: 'Jelaskan menurut kamu apa yang kamu kerjakan tadi.', rows: 5, columns: 60 },
    { prompt: 'Ada masukan untuk tes ini?', rows: 5, columns: 60 }
  ],
  data: { exp_id: "discount_titrate", trial_id: "post_task_questions" }
};

let end_block = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <div class='centerbox'>
      <p class='center-block-text'>Thanks for completing this task!</p>
      <p class='center-block-text'>Press <strong>Enter</strong> to submit your data.</p>
    </div>
  `,
  choices: ['Enter'],
  data: { trial_id: "end", exp_id: "discount_titrate" },
  on_finish: function() {
    assessPerformance();
    let experimentData = jsPsych.data.get().json();
    fetch("https://script.google.com/macros/s/AKfycbyTxDcv470x2k-1IZsmA2pUwsD3-QVsw7ynMI2qD0-iMXv_wGC9E3B1xoLvalLXh6-__Q/exec", {
      method: 'POST',
      mode: 'no-cors',
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

// Build the final timeline & run
let timeline = [];
timeline.push(feedback_instruct_block);
timeline.push(instructions_block);
timeline.push(start_practice_block);
timeline.push(practice_block);
timeline.push(start_test_block);
timeline.push(test_block);
// if (run_attention_checks) { timeline.push(... attention check trial ...) }
timeline.push(post_task_block);
timeline.push(end_block);

jsPsych.run(timeline);
