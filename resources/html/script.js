var timer;
var timeEnd;

var intervalToUpdate_ms = 10 * 1000;
var intervalEnd;

var priority = ["Immediate", "High", "Regular"];

var currentTask;

// request permission on page load
document.addEventListener('DOMContentLoaded', function () {
  if (Notification.permission !== "granted")
    Notification.requestPermission();

  // Get all unfinished tasks.
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        handleTasksReply(this.responseText);
    }
  };

  displayTime(getRemainingTime(), $("#time"));

  xhttp.open("GET", "http://localhost:9080/basched/unfinishedtasks", true);
  xhttp.send();
});

function notifyMe() {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.'); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('Notification title', {
//      icon: 'http://cdn.sstatic.net/stackexchange/img/logos/so/so-icon.png',
      body: "Timer Ended !",
    });

    notification.onclick = function () {
        window.location.href = 'http://localhost:9080/html/index.html';
//      window.open("http://localhost:9080/html/index.html");
    };
  }

}

function startStopButton() {
    var btnStart = $("#startTaskBtn");
    var btnState = btnStart.text();
    if (btnState == "Start") {
        startTimer();
        btnStart.text("Stop");
    } else {
        stopTimer();
        btnStart.text("Start");
    }
}

function startTimer() {
    timer = setInterval(timerEnds, 1000);

    var currentTime = new Date().getTime();
    timeEnd = currentTime + getRemainingTime();

    resetCommitInterval(currentTime);
}

function stopTimer() {
    var currentTime = new Date().getTime();
    commitRecord(currentTime);
    clearInterval(timer);
}

// Sets when the commit interval should happen.
function resetCommitInterval(currentTime) {
    intervalEnd = currentTime + intervalToUpdate_ms;
}

// Checks if the timer ended. If ended notifies the user and stops the interval.
function timerEnds() {
    var currentTime = new Date().getTime();
    if (currentTime > timeEnd) {
        notifyMe();
        stopTimer();
    } else {
        // If the timer ends, avoid duplicate record commit.
        handleCommitInterval(currentTime);
    }

    displayTime(timeEnd - currentTime, $("#time"));
}

// Checks if an interval passed and commits the work to the server.
function handleCommitInterval(currentTime) {
//    var currentTime = new Date().getTime();
    if (currentTime > intervalEnd) {
        commitRecord(currentTime);
        resetCommitInterval(currentTime);
    }

    displayTime(intervalEnd - currentTime, $("#intervalTime"));
}

// It means that it adds a row to the RECORDS table.
function commitRecord(currentTime) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        handleRecordCommitResponse(this);
    };


    var taskid = currentTask.id;
    var timestamp = currentTime;
    // Calculate how much time the duration of the interval was.
    // The max length of an interval without the part of the time that passed.
    var duration = intervalToUpdate_ms - Math.max(0, intervalEnd - currentTime);
    xhttp.open("POST",
        "http://localhost:9080/basched/addRecord?taskid="+taskid+"&timestamp="+timestamp+"&duration="+duration,
        true);
    xhttp.send();
}

function handleRecordCommitResponse(responseObject) {
    if (responseObject.readyState == 4 && responseObject.status == 201) {
        console.log("Record Committed !");
    } else if (responseObject.readyState == 4) {
        console.log("Could not commit record !");
    }
}

// Display the remaining pomodoro time in a pretty way :)
function displayTime(timeToDisplay, domObject) {
    var minutesRemaining = Math.floor(timeToDisplay / 1000 / 60);
    var secondsRemaining = Math.floor((timeToDisplay / 1000) - (minutesRemaining * 60));

    var mintsToDisp = (minutesRemaining < 10) ? "0" + minutesRemaining : minutesRemaining;
    var scndsToDisp = (secondsRemaining < 10) ? "0" + secondsRemaining : secondsRemaining;

    domObject.text(mintsToDisp + ":" + scndsToDisp);
}

function gotoAddTaskPage() {
    window.location.href = 'http://localhost:9080/html/AddTask.html';
}

function handleTasksReply(response) {
    console.log("Unfinished task reply handling now.")
    var tasks = JSON.parse(response).tasks;
    var tasksRows = [];
    var current_task = ""
    for (var i = 0; i < tasks.length; i++) {
        var taskName = tasks[i].name;
        var taskPri = priority[tasks[i].priority];
        var html = "<tr><td>"+taskName+"</td><td>"+taskPri+"</td></tr>"
        if (tasks[i].current == true) {
            current_task = html;
            currentTask = tasks[i];
        } else {
            tasksRows.push(html);
        }
    }

    var waitingTasks = $("#tasks_table");
    waitingTasks.append(tasksRows.join(""));
    $("#current_task").append(current_task);
}

// Returns the amount of time in ms remaining in the pomodoro of the current task.
//TODO: Extract the remaining time from the task itself.
function getRemainingTime() {
    return 25 * 60 * 1000;
}