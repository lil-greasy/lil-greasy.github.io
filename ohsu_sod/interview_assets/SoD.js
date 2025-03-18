"use strict";

if (!window.SoD) { window.SoD = {}; }

SoD.maximumInterviewsPerDay = 10;
SoD.interviews = [];
SoD.questionBank = {};

SoD.fetchJSON = async function(url, description) {
    try {
        if (description) {
            description = " for " + description;
        } else {
            description = " at " + url;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch JSON file" + description + ". Status from server: " + response.status);
        }
        const json = await response.json();
        return json;
    } catch (error) {
        console.error(error.message);
    }
};

SoD.message = function(conf) {
    const messageBox = document.createElement("dialog");
    messageBox.classList.add("message");

    if (conf.heading) {
        const msgHeading = document.createElement("h5");
        msgHeading.innerText = conf.heading;
        messageBox.appendChild(msgHeading);
    }

    const msgBody = document.createElement("p");
    msgBody.classList.add("body");
    if (typeof conf == "string") {
        msgBody.innerText = conf;
    } else {
        msgBody.innerText = conf.body;
    }
    messageBox.appendChild(msgBody);

    const closeButton = document.createElement("button");
    closeButton.classList.add("close-button");
    closeButton.addEventListener("click", function() {
        messageBox.remove();
    });
    messageBox.appendChild(closeButton);

    return messageBox;
};

SoD.getCurrentInterview = function() {
    const tocList = document.querySelector("#sidebar ul.toc-entries");
    for (const listItem of tocList.children) {
        const h3 = listItem.querySelector("h3");
        if (h3.classList.contains("active")) {
            const interviewIndex = listItem.getAttribute("interview-index");
            return listItem.interview;
        }
    }
    return false;
};

SoD.loadInterviews = function() {
    const interviews = [];
    for (let i = 1; i <= SoD.maximumInterviewsPerDay; i++) {
        const text = Qualtrics.SurveyEngine.getJSEmbeddedData("Interview_" + i);
        if (text) {
            const json = JSON.parse(text);
            interviews.push(json);
        }
    }
    for (const interview of interviews) {
        for (const category in interview.questions) {
            const question = interview.questions[category];
            question.content = SoD.questionBank[category][question.number];
        }

        interview.number = interviews.indexOf(interview) + 1;
        interview.applicant.fullName = `${interview.applicant.firstName} ${interview.applicant.lastName}`;
        interview.questionsAsHTML = function() {
            const scrollWrapper = document.createElement("div");
            scrollWrapper.classList.add("question-list-scroll-wrapper");

            const mainOL = document.createElement("ol");
            mainOL.classList.add("question-list");

            for (const category in interview.questions) {
                const mainLI = document.createElement("li");
                mainLI.classList.add("question-set");
                const content = interview.questions[category].content;

                const mainQuestion = document.createElement("p");
                mainQuestion.classList.add("main-question");
                mainQuestion.innerText = content.main;
                mainLI.appendChild(mainQuestion);

                const probingUL = document.createElement("ul");
                probingUL.classList.add("probing-questions");
                for (const probingQuestion of content.probing) {
                    const probingLI = document.createElement("li");
                    probingLI.innerText = probingQuestion;
                    probingUL.appendChild(probingLI);
                }
                mainLI.appendChild(probingUL);

                mainOL.appendChild(mainLI);
            }
            scrollWrapper.appendChild(mainOL);
            return scrollWrapper;
        }
    }
    return interviews;
};

SoD.hideQualtricsAd = function() {
    const ad = document.querySelector(".plug-container");
    if (ad) { ad.remove(); }
};
SoD.replaceFavIcon = function(url = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_sj3IStYjELgtVdx") {
    const linkElement = document.querySelector("head link[rel=\"icon\"]");
    linkElement.href = url;
};

SoD.changeNextButtonContent = function(content) {
    const nextButton = document.getElementById("next-button");
    const insertionPoint = nextButton.querySelector("span");
    insertionPoint.innerText = content;
    nextButton.setAttribute("aria-label", content);
}

SoD.markQuestionContainer = function(startingPoint, questionName) {
    let domClimber = startingPoint;
    while (!domClimber.classList.contains("question")) {
        domClimber = domClimber.parentElement;
    }
    domClimber.setAttribute("question-type", questionName);

    return domClimber;
};

SoD.customizeScoringQuestions = function() {
    const insertionMarkers = document.querySelectorAll(".insertion-point.eval-rubric");

    for (const insertionMarker of insertionMarkers) {
        const qualityName = insertionMarker.getAttribute("quality");
        const quality = SoD.evalRubric.qualities[qualityName];
        const questionContainer = SoD.markQuestionContainer(insertionMarker, "Quality scoring");
        const choices = questionContainer.querySelectorAll(".choice.radio");

        const qualitySpan = document.createElement("span");
        qualitySpan.classList.add("quality-name");
        qualitySpan.innerText = qualityName;
        insertionMarker.replaceChildren(qualitySpan);

        for (const choice of choices) {
            const label = choice.querySelector("label span span span");
            const score = label.innerText;
            choice.setAttribute("score", score);

            label.innerText = "";
            
            const scoreName = document.createElement("span");
            scoreName.classList.add("score-name");
            scoreName.innerText = SoD.evalRubric.scores[score];
            label.appendChild(scoreName);

            const scoreDescContent = quality[score].description;
            if (scoreDescContent) {
                const scoreDescription = document.createElement("span");
                scoreDescription.classList.add("score-description");
                scoreDescription.innerText = scoreDescContent;
                label.appendChild(scoreDescription);
            }

            const scoreKeywordsContent = quality[score].keywords;
            if (scoreKeywordsContent) {
                const scoreKeywords = document.createElement("ul");
                scoreKeywords.classList.add("keywords");
                for (const keyword of scoreKeywordsContent) {
                    const li = document.createElement("li");
                    li.innerText = keyword;
                    scoreKeywords.appendChild(li);
                }
                label.appendChild(scoreKeywords);
            }
        }
    }

    const firstScoringQuestion = document.querySelector(".question[question-type=\"Quality scoring\"]");
    firstScoringQuestion.setAttribute("first-eval-question", "");
};

SoD.customizeObservationQuestions = function() {
    const markers = document.querySelectorAll(".insertion-point.observations");
    for (const marker of markers) {
        const questionContainer = SoD.markQuestionContainer(marker, "Observations");
        const textarea = questionContainer.querySelector("textarea");

        textarea.removeAttribute("style");
    }
};

SoD.notepadInit = function() {
    const marker = document.querySelector(".notepad-marker");
    if (marker) {
        const question = SoD.markQuestionContainer(marker, "Notepad");
        question.textarea = question.querySelector("textarea");

        question.activateStorage = function() {
            const saveInterval = 10 * 1000;
            const suspiciousDesplacementFactor = 0.25;
            const suspiciousDisplacementMinimum = 30;

            question.textarea.storage = {
                currentData: {
                    id: SoD.getCurrentInterview().applicant.id,
                    timestamp: Date.now(),
                    notes: question.textarea.value,
                    backup: ""
                },

                update: function() {
                    const currentData = question.textarea.storage.currentData;
                    currentData.timestamp = Date.now();
                    let statusMessage;
                    if (question.textarea.value.length < currentData.notes.length * suspiciousDesplacementFactor && currentData.notes.length > suspiciousDisplacementMinimum) {
                        currentData.backup = currentData.notes;
                        statusMessage = document.createElement("span");
                        statusMessage.append("A conspicuous amount of information was just displaced from your notes, and has temporarily been backed up.");
                        statusMessage.appendChild(question.textarea.storage.restoreFromBackupButton);
                    }
                    currentData.notes = question.textarea.value;
                    return statusMessage;
                },

                save: function() {
                    const statusMessages = [];
                    const updateMessage = question.textarea.storage.update();
                    if (updateMessage) {
                        statusMessages.push(updateMessage);
                    }
                    const currentData = question.textarea.storage.currentData;
                    const existingStoredData = JSON.parse(localStorage.getItem(question.textarea.storage.key));
                    if (!existingStoredData || currentData.notes !== existingStoredData.notes) {
                        localStorage.setItem(question.textarea.storage.key, JSON.stringify(currentData));
                        statusMessages.push(`Saved ${question.textarea.storage.currentData.notes.length} characters to local storage.`);
                        question.textarea.storage.statusReport("save", statusMessages);
                    }
                },

                restore: function() {
                    const dataFromStorage = JSON.parse(localStorage.getItem(question.textarea.storage.key));
                    if (dataFromStorage) {
                        const statusMessages = [];
                        if (dataFromStorage.notes.length > 0) {
                            if (dataFromStorage.notes.length < question.textarea.value.length * suspiciousDesplacementFactor && question.textarea.value.length > suspiciousDisplacementMinimum) {
                                question.textarea.storage.currentData.backup = question.textarea.value;
                                const backupRestoreMessage = document.createElement("span");
                                backupRestoreMessage.append("A conspicuous amount of information was just overwritten, and has temporarily been backed up.");
                                backupRestoreMessage.appendChild(question.textarea.storage.restoreFromBackupButton);
                                statusMessages.push(backupRestoreMessage);
                            }
                            question.textarea.value = dataFromStorage.notes;
                            question.textarea.storage.update();
                            statusMessages.push(`Restored ${dataFromStorage.notes.length} characters from local storage.`);
                            question.textarea.storage.statusReport("restore", statusMessages);
                        } else {
                            if (dataFromStorage.backup && dataFromStorage.backup.length > 0) {
                                const statusMessage = document.createElement("span");
                                question.textarea.storage.currentData.backup = dataFromStorage.backup;
                                statusMessage.append("Your notes are empty, but there are backup data available.");
                                statusMessage.appendChild(question.textarea.storage.restoreFromBackupButton);
                                statusMessages.push(statusMessage);
                                question.textarea.storage.statusReport("offer-to-restore-from-backup", statusMessages);
                            }
                        }
                    }
                },

                restoreFromBackup: function() {
                    question.textarea.value = question.textarea.storage.currentData.backup;
                    question.textarea.storage.statusReport("restore-from-backup", [`Restored ${question.textarea.value.length} characters from backup.`]);
                    question.textarea.storage.update();
                },

                statusReport: function(className, messages) {
                    const popup = question.textarea.storage.statusPopup;
                    popup.timeToLive = 1000;
                    if (popup.timeoutID) {
                        clearTimeout(popup.timeoutID);
                    }
                    popup.replaceChildren("");
                    for (const message of messages) {
                        const p = document.createElement("p");
                        p.append(message);
                        popup.appendChild(p);

                        if (message.length) {
                            popup.timeToLive += (message.length * 50);
                        }
                        if (message.childNodes) {
                            for (const child of message.childNodes) {
                                if (child.length) {
                                    popup.timeToLive += (child.length * 50);
                                }
                            }
                        }
                    }
                    question.textarea.storage.statusPopup.classList.add("active", className);

                    popup.deathClock(popup.timeToLive);
                },

                statusPopup: document.createElement("div"),
                restoreFromBackupButton: document.createElement("button")
            }

            question.textarea.storage.key = `notes_${question.textarea.storage.currentData.id}`;

            const restoreFromBackupButton = question.textarea.storage.restoreFromBackupButton;
            restoreFromBackupButton.classList.add("restore-from-backup");
            restoreFromBackupButton.innerText = "Restore from backup";
            restoreFromBackupButton.addEventListener("click", question.textarea.storage.restoreFromBackup);

            const popup = question.textarea.storage.statusPopup;
            popup.classList.add("status-popup");
            popup.deathClock = function() {
                popup.timeoutID = setTimeout(function() {
                    popup.classList.remove("active");
                }, popup.timeToLive);
            }
            popup.addEventListener("mouseenter", function() {
                clearTimeout(popup.timeoutID);
            });
            popup.addEventListener("mouseleave", popup.deathClock);
            question.textarea.insertAdjacentElement("afterend", popup);

            if (question.textarea.value.length < 1) {
                question.textarea.storage.restore();
            }
            setInterval(question.textarea.storage.save, saveInterval);
            question.textarea.addEventListener("blur", question.textarea.storage.save);
        }
        question.activateStorage();
    }
}

SoD.customizeRecommendationQuestion = function() {
    const marker = document.querySelector(".insertion-point.recommendation");
    if (marker) {
        const question = SoD.markQuestionContainer(marker, "Recommendation");

        for (const choice of question.querySelectorAll(".choice.radio")) {
            choice.content = choice.querySelector("label span span span").innerText;
            choice.setAttribute("recommendation", choice.content);
        }
    }
}

SoD.customizeOverallCommentsQuestion = function() {
    const marker = document.querySelector(".insertion-point.overall-comments");
    if (marker) {
        const question = SoD.markQuestionContainer(marker, "Overall comments");
        question.textarea = question.querySelector("textarea");
        question.textarea.removeAttribute("style");
    }
}

SoD.onInterviewDataReady = function() {
    function populateTOC() {
        const tocListItems = document.querySelectorAll("#sidebar .toc-tree .toc-entries > li");
        for (const interview of SoD.interviews) {
            const listItem = tocListItems[SoD.interviews.indexOf(interview)];
            if (listItem) {
                listItem.label = listItem.querySelector("h3 :is(a, div)");
                listItem.setAttribute("aadsas-id", interview.applicant.id);
                listItem.setAttribute("interview-number", interview.number);
                listItem.interview = interview;
                listItem.label.innerText = interview.applicant.fullName;
            }
        }
    }
    populateTOC();

    function initInterviewQuestions() {
        const marker = document.querySelector(".insertion-point.interview-questions");
        SoD.markQuestionContainer(marker, "Interview questions");
        const interview = SoD.getCurrentInterview();
        if (interview) {
            const content = interview.questionsAsHTML();
            marker.replaceChildren(content);
        } else {
            const errorMessage = SoD.message({
                heading: "Something is not right.",
                body: "No interview data is associated with this link."
            });
            document.body.appendChild(errorMessage);
            errorMessage.showModal();
        }
    }
    initInterviewQuestions();

    function insertNames() {
        const replacements = [
            {
                className: "applicant-first-name",
                content: SoD.getCurrentInterview().applicant.firstName
            }
        ];

        for (const replacement of replacements) {
            const insertionPoints = document.querySelectorAll(`.insertion-point.${replacement.className}`);
            for (const insertionPoint of insertionPoints) {
                insertionPoint.innerText = replacement.content;
            }
        }
    }
    insertNames();
    
    SoD.notepadInit();
    SoD.customizeScoringQuestions();
    SoD.customizeObservationQuestions();
    SoD.customizeRecommendationQuestion();
};

SoD.init = async function() {
    SoD.hideQualtricsAd();
    SoD.replaceFavIcon();

    try {
        SoD.evalRubric = await SoD.fetchJSON(SoD.resourceURLs.evalRubric, "evaluation rubric");
    } catch (error) {
        const rubricError = SoD.message({ heading: "Failed to load evaluation rubric!", body: error });
        document.body.appendChild(rubricError);
        rubricError.show();
        throw error;
    }

    try {
        SoD.questionBank = await SoD.fetchJSON(SoD.resourceURLs.questionBank, "question bank");
    } catch (error) {
        const questionBankError = SoD.message({ heading: "Failed to load question bank!", body: error});
        document.body.appendChild(questionBankError);
        questionBankError.show();
        throw error;
    }

    SoD.interviews = SoD.loadInterviews();
    if (SoD.interviews.length > 0) {
        SoD.onInterviewDataReady();
    }
};

Qualtrics.SurveyEngine.addOnReady(function() {
    SoD.init();
});
