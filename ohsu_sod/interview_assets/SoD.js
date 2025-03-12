"use strict";

class SoD {
    static #evalRubricURL = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_hdEKnZipEZAZyXR";
    static #questionBankURL = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_U3aLMo6iTNShhRr";
    static #maximumInterviewsPerDay = 10;
    static interviews = [];
    static questionBank = {};

    static async #fetchJSON(url, description) {
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

    static message(conf) {
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

    static getCurrentInterview() {
        const tocList = document.querySelector("#Toc > ul");
        for (const listItem of tocList.children) {
            if (listItem.classList.contains("Current")) {
                const interviewIndex = listItem.getAttribute("interview-index");
                if (interviewIndex) {
                    return SoD.interviews[interviewIndex];
                } else {
                    return false;
                }
            }
        }
        return false;
    };

    static loadInterviews() {
        const interviews = [];
        for (let i = 1; i <= SoD.#maximumInterviewsPerDay; i++) {
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

    static hideQualtricsAd() {
        const ad = document.getElementById("Plug");
        ad.remove();
    };
    static replaceFavIcon(url = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_sj3IStYjELgtVdx") {
        const linkElement = document.querySelector("head link[rel=\"icon\"]");
        linkElement.href = url;
    };

    static #findCousinElement(markerQuery, targetQuery) {
        let domClimber = document.querySelector(markerQuery);
        while (!domClimber.classList.contains("QuestionOuter")) {
            domClimber = domClimber.parentElement;
        }
        return domClimber.querySelector(targetQuery);
    };
    static #labelQuestionContainer(markerQuery, className = markerQuery.replace(".", "")) {
        let domClimber = document.querySelector(markerQuery);
        while (!domClimber.classList.contains("QuestionOuter")) {
            domClimber = domClimber.parentElement;
        }
        domClimber.classList.add(className);
    };
    static #markQuestionContainer(startingPoint, className) {
        let domClimber = startingPoint;
        while (!domClimber.classList.contains("QuestionOuter")) {
            domClimber = domClimber.parentElement;
        }
        domClimber.classList.add(className);
        return domClimber;
    };

    static activateEvalSkipper() {
        const checkbox = SoD.#findCousinElement(".eval-skipper", "input[type=\"checkbox\"]");
        SoD.#labelQuestionContainer(".eval-skipper");

        if (checkbox) {
            function getOtherQuestionInputs() {
                const otherQuestionContainers = document.querySelectorAll(".QuestionOuter:not(.eval-skipper)");
                let inputs = [];
                for (const container of otherQuestionContainers) {
                    container.inputs = container.querySelectorAll(":is(input, textarea)");
                    for (const input of container.inputs) {
                        inputs.push(input);
                    }
                }
                return inputs;
            }
            function updateDisabledState() {
                const otherInputs = getOtherQuestionInputs();
                if (checkbox.checked) {
                    document.body.classList.add("skip-eval");
                    for (const input of otherInputs) {
                        input.disabled = true;
                    }
                } else {
                    document.body.classList.remove("skip-eval");
                    for (const input of otherInputs) {
                        input.disabled = false;
                    }
                }
            }
            checkbox.addEventListener("input", updateDisabledState);

            // I don’t know why we have to manually uncheck the checkbox!
            checkbox.checked = false;
            updateDisabledState();
        }
    };

    static insertRubricKeys() {
        const insertionPoints = document.querySelectorAll(".insertion-point.rubric-key");

        for (const insertionPoint of insertionPoints) {
            const quality = insertionPoint.getAttribute("quality");
            const rubricKey = new RubricKey(quality);
            insertionPoint.replaceChildren(rubricKey);
        }
    };

    static populateScoringQuestions() {
        const insertionMarkers = document.querySelectorAll(".rubric-insertion-marker");

        for (const insertionMarker of insertionMarkers) {
            const qualityName = insertionMarker.getAttribute("quality");
            const quality = SoD.evalRubric.qualities[qualityName];
            const questionContainer = SoD.#markQuestionContainer(insertionMarker, "quality-rating-question");
            const listItems = questionContainer.querySelectorAll("li.Selection");

            const qualitySpan = document.createElement("span");
            qualitySpan.classList.add("quality-name");
            qualitySpan.innerText = qualityName;
            insertionMarker.replaceChildren(qualitySpan);

            for (const li of listItems) {
                const label = li.querySelector("label.SingleAnswer span")
                const score = label.innerText;
                li.setAttribute("score", score);

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
    };

    static activateNotepadBackup() {
        const textarea = this.#findCousinElement(".notepad-marker", "textarea");
        const saveInterval = 10 * 1000;

        if (textarea) {
            textarea.backup = {
                data: {
                    id: SoD.getCurrentInterview().applicant.id,
                    timestamp: Date.now(),
                    notes: textarea.value
                },
                update: function() {
                    textarea.backup.data.timestamp = Date.now();
                    textarea.backup.data.notes = textarea.value;
                },
                save: function() {
                    textarea.backup.update();
                    const existingBackup = JSON.parse(localStorage.getItem(textarea.backup.key));
                    const currentContent = textarea.backup.data;
                    if (currentContent.notes !== existingBackup.notes) {
                        localStorage.setItem(textarea.backup.key, JSON.stringify(currentContent));
                        textarea.backup.statusReport("save", `Saved ${textarea.backup.data.notes.length} characters to local backup.`);
                    }
                },
                restore: function() {
                    const backupData = JSON.parse(localStorage.getItem(textarea.backup.key));
                    if (backupData.notes.length > 0) {
                        textarea.value = backupData.notes;
                        textarea.backup.statusReport("restore", `Restored ${backupData.notes.length} characters from local backup.`);
                    }
                },
                statusPopup: document.createElement("div"),
                statusReport: function(className, message) {
                    const timeToLive = 2 * 1000;
                    textarea.backup.statusPopup.innerText = message;
                    textarea.backup.statusPopup.classList.add("active", className);
                    setTimeout(function() {
                        textarea.backup.statusPopup.classList.remove("active", className);
                    }, timeToLive);
                }
            }
            textarea.backup.key = `notes_${textarea.backup.data.id}`;
            textarea.backup.statusPopup.classList.add("status-popup");
            textarea.insertAdjacentElement("afterend", textarea.backup.statusPopup);

            if (textarea.value.length < 1) {
                textarea.backup.restore();
            }
            setInterval(textarea.backup.save, saveInterval);
        }
    };

    static #onInterviewDataReady() {
        function populateTOC() {
            const tocLabels = document.querySelectorAll("#Toc ul li a .TocText");
            const tocListItems = document.querySelectorAll("#Toc ul > li");
            for (const interview of SoD.interviews) {
                const index = SoD.interviews.indexOf(interview);
                const interviewNumber = index + 1;
                const listItem = tocListItems[index];
                listItem.setAttribute("aadsas-id", interview.applicant.id);
                listItem.setAttribute("interview-number", interviewNumber);
                listItem.setAttribute("interview-index", index);
                tocLabels[index].innerText = interview.applicant.fullName;
            }
        }
        populateTOC();

        function insertInterviewQuestions() {
            const insertionPoints = document.querySelectorAll(".question-content[content-type='questions']");
            const interview = SoD.getCurrentInterview();
            for (const insertionPoint of insertionPoints) {
                if (interview) {
                    const content = interview.questionsAsHTML();
                    insertionPoint.replaceChildren(content);
                } else {
                    const errorMessage = SoD.message({
                        heading: "Something is not right.",
                        body: "No interview data is associated with this link."
                    });
                    document.body.appendChild(errorMessage);
                    errorMessage.showModal();
                }
            }
        }
        insertInterviewQuestions();

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
        
        SoD.activateNotepadBackup();
        SoD.populateScoringQuestions();
    };

    static async init() {
        SoD.hideQualtricsAd();
        SoD.replaceFavIcon();

        SoD.activateEvalSkipper();

        try {
            SoD.evalRubric = await SoD.#fetchJSON(SoD.#evalRubricURL, "evaluation rubric");
        } catch (error) {
            const rubricError = SoD.message({ heading: "Failed to load evaluation rubric!", body: error });
            document.body.appendChild(rubricError);
            rubricError.show();
            throw error;
        }

        try {
            SoD.questionBank = await SoD.#fetchJSON(SoD.#questionBankURL, "question bank");
        } catch (error) {
            const questionBankError = SoD.message({ heading: "Failed to load question bank!", body: error});
            document.body.appendChild(questionBankError);
            questionBankError.show();
            throw error;
        }

        SoD.interviews = SoD.loadInterviews();
        if (SoD.interviews.length > 0) {
            SoD.#onInterviewDataReady();
        }
    };
}

class RubricKey {
    constructor(qualityName) {
        if (!SoD.evalRubric) {
            throw new Error("Unable to create rubric key. Evaluation rubric not loaded.");
        }
        const quality = SoD.evalRubric.qualities[qualityName];

        const rubricKey = document.createElement("table");
        rubricKey.classList.add("rubric-key");
        rubricKey.setAttribute("quality", qualityName);
        
        const tHead = document.createElement("thead");
        tHead.tr = document.createElement("tr");
        tHead.appendChild(tHead.tr);

        const tBody = document.createElement("tbody");
        tBody.tr = document.createElement("tr");
        for (const score in SoD.evalRubric.scores) {
            const headTD = document.createElement("td");
            headTD.classList.add("score-name");
            headTD.setAttribute("score", score);
            headTD.innerText = SoD.evalRubric.scores[score];
            tHead.tr.appendChild(headTD);

            const bodyTD = document.createElement("td");
            bodyTD.setAttribute("score", score);
            if (quality[score].description) {
                const description = document.createElement("p");
                description.classList.add("description");
                description.innerText = quality[score].description;
                bodyTD.appendChild(description);
            }
            if (quality[score].keywords) {
                const keywords = quality[score].keywords;
                const keywordsUL = document.createElement("ul");
                keywordsUL.classList.add("keywords");
                for (const keyword of keywords) {
                    const li = document.createElement("li");
                    li.classList.add("keyword");
                    li.innerText = keyword;
                    keywordsUL.appendChild(li);
                }
                bodyTD.appendChild(keywordsUL);
            }
            tBody.tr.appendChild(bodyTD);
        }
        tBody.appendChild(tBody.tr);

        rubricKey.appendChild(tHead);
        rubricKey.appendChild(tBody);
        return rubricKey;
    }
}

Qualtrics.SurveyEngine.addOnReady(function() {
    SoD.init();
})