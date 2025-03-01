"use strict";

class SoD {
    static #evalRubricURL = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_hdEKnZipEZAZyXR";
    static #questionBankURL = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_U3aLMo6iTNShhRr";
    static #maximumInterviewsPerDay = 10;

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
    }

    static getInterview() {
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
    }

    static populateCandidateName() {
        const target = document.querySelector("#applicant-name");
        const preamble = document.querySelector("#Header h2 .preamble");
        const blockNumber = this.getBlockNumber();
        const fieldName = "Candidate" + blockNumber;
        const candidateName = Qualtrics.SurveyEngine.getJSEmbeddedData(fieldName);
        preamble.innerText = "Currently evaluating ";
        if (candidateName) {
            target.innerText = candidateName;
        } else {
            target.innerText = "a candidate";
        }
    };
    static populateInterviewerName() {
        const target = document.querySelector("#Toc strong");
        const first = Qualtrics.SurveyEngine.getJSEmbeddedData("RecipientFirstName");
        const last = Qualtrics.SurveyEngine.getJSEmbeddedData("RecipientLastName");
        if (first && last) {
            target.innerText = (first + " " + last);
        }
    };
    static populateCandidateMenu() {
        const listItems = document.querySelectorAll("#Toc .TocText");
        for (const i = 0; i < listItems.length; i++) {
            const thisOnesName = Qualtrics.SurveyEngine.getJSEmbeddedData("Candidate" + (i + 1));
            if (thisOnesName) {
                listItems[i].innerText = thisOnesName;
            }
        }
    };
    static hideQualtricsAd() {
        const ad = document.getElementById("Plug");
        ad.remove();
    };
    static replaceFavIcon(url = "https://ohsu.yul1.qualtrics.com/ControlPanel/File.php?F=F_sj3IStYjELgtVdx") {
        const linkElement = document.querySelector("head link[rel=\"icon\"]");
        linkElement.href = url;
    };
    static commonRoutine() {
        this.populateCandidateName();
        this.populateCandidateMenu();
        this.hideQualtricsAd();
        this.populateInterviewerName();
    };

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

    static #onInterviewDataReady() {
        function addFullNames() {
            for (const interview of SoD.interviews) {
                interview.applicant.fullName = interview.applicant.firstName + " " + interview.applicant.lastName;
            }
        }
        addFullNames();

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

        function insertQuestions() {
            const insertionPoints = document.querySelectorAll(".question-content[content-type='questions']");
            const interview = SoD.getInterview();
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
        insertQuestions();
    }

    static async init() {
        SoD.hideQualtricsAd();
        SoD.replaceFavIcon();
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
        if (SoD.interviews) {
            SoD.#onInterviewDataReady();
        }
    };
}
SoD.init();

class RubricKey {
    constructor(quality) {
        if (!SoD.evalRubric) {
            throw new Error("Unable to create eval slider. Evaluation rubric not loaded.");
        }

        const rubricKey = document.createElement("table");
        rubricKey.classList.add("rubric-key");
        
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
})