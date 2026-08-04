"use client";

import { useEffect, useState } from "react";

type Artist = "john" | "kacey";

type Lyric = {
  line: string;
  song: string;
  artist: Artist;
};

type Phase = "intro" | "quiz" | "result";

const QUIZ_LENGTH = 10;
const SCORE_FILL_DELAY = 160;
const SCORE_FILL_DURATION = 4000;
const RESULT_COPY_PAUSE = 1000;

const TITLE_WORDS = [
  { word: "The", clipPath: "inset(30% 58% 56% 25%)" },
  { word: "great", clipPath: "inset(30% 27% 56% 41%)" },
  { word: "Is", clipPath: "inset(42% 80% 43% 8%)" },
  { word: "It", clipPath: "inset(42% 71% 43% 18%)" },
  { word: "John", clipPath: "inset(42% 52% 43% 26%)" },
  { word: "or", clipPath: "inset(42% 42% 43% 45%)" },
  { word: "Kasey", clipPath: "inset(42% 10% 43% 54%)" },
  { word: "Quiz", clipPath: "inset(53% 36% 33% 38%)" },
];

function parseLyrics(source: string): Lyric[] {
  const lyrics: Lyric[] = [];
  let artist: Artist | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "JOHN MAYER") {
      artist = "john";
      continue;
    }

    if (line === "KACEY MUSGRAVES") {
      artist = "kacey";
      continue;
    }

    if (!artist) continue;

    const openingQuote = line.indexOf("“");
    const divider = line.lastIndexOf("” — ");

    if (openingQuote === -1 || divider === -1) continue;

    lyrics.push({
      line: line.slice(openingQuote + 1, divider),
      song: line.slice(divider + 4),
      artist,
    });
  }

  return lyrics;
}

function drawQuiz(pool: Lyric[]): Lyric[] {
  const shuffled = [...pool];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, QUIZ_LENGTH);
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [pool, setPool] = useState<Lyric[]>([]);
  const [quiz, setQuiz] = useState<Lyric[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [isWrongAnswer, setIsWrongAnswer] = useState(false);
  const [fillScore, setFillScore] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [showResultCopy, setShowResultCopy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLyrics() {
      try {
        const response = await fetch(
          "/john_mayer_kacey_musgraves_lyrics_quiz.txt",
        );
        if (!response.ok) throw new Error("Could not load lyric file");

        const parsed = parseLyrics(await response.text());
        if (parsed.length < QUIZ_LENGTH) throw new Error("Not enough lyrics");

        if (!cancelled) {
          setPool(parsed);
          setQuiz(drawQuiz(parsed));
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }

    loadLyrics();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;

    const introTimer = window.setTimeout(() => {
      setPhase("quiz");
    }, 3000);

    return () => window.clearTimeout(introTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "result") return;

    setDisplayedScore(0);
    let scoreTimer: number | undefined;
    const fillTimer = window.setTimeout(
      () => setFillScore(true),
      SCORE_FILL_DELAY,
    );
    const countStartTimer = window.setTimeout(() => {
      if (score === 0) return;

      scoreTimer = window.setInterval(() => {
        setDisplayedScore((current) => {
          const next = Math.min(current + 1, score);
          if (next === score && scoreTimer !== undefined) {
            window.clearInterval(scoreTimer);
          }
          return next;
        });
      }, SCORE_FILL_DURATION / score);
    }, SCORE_FILL_DELAY);
    const copyTimer = window.setTimeout(
      () => setShowResultCopy(true),
      SCORE_FILL_DELAY +
        (score === 0 ? 0 : SCORE_FILL_DURATION) +
        RESULT_COPY_PAUSE,
    );

    return () => {
      window.clearTimeout(fillTimer);
      window.clearTimeout(countStartTimer);
      window.clearTimeout(copyTimer);
      if (scoreTimer !== undefined) window.clearInterval(scoreTimer);
    };
  }, [phase, score]);

  const currentLyric = quiz[questionIndex];
  function answer(choice: Artist) {
    if (!currentLyric || isChanging) return;

    const isCorrect = choice === currentLyric.artist;
    const nextScore = score + (isCorrect ? 1 : 0);
    setIsChanging(true);
    setIsWrongAnswer(!isCorrect);

    window.setTimeout(() => {
      setScore(nextScore);

      if (questionIndex === QUIZ_LENGTH - 1) {
        setPhase("result");
      } else {
        setQuestionIndex((current) => current + 1);
      }

      setIsChanging(false);
      setIsWrongAnswer(false);
    }, isCorrect ? 260 : 520);
  }

  function playAgain() {
    setQuiz(drawQuiz(pool));
    setQuestionIndex(0);
    setScore(0);
    setFillScore(false);
    setDisplayedScore(0);
    setShowResultCopy(false);
    setIsChanging(false);
    setIsWrongAnswer(false);
    setPhase("intro");
  }

  if (phase === "intro") {
    return (
      <main className="intro" aria-label="John or Kacey quiz introduction">
        <div className="title-sequence" aria-label="The great Is It John or Kasey Quiz">
          {TITLE_WORDS.map(({ word, clipPath }, index) => (
            <img
              className="title-word"
              src="/title.svg"
              alt=""
              aria-hidden="true"
              key={word}
              style={
                {
                  clipPath,
                  "--word-delay": `${80 + index * 250}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </main>
    );
  }

  if (phase === "result") {
    return (
      <main className="result" aria-label="Quiz result">
        <div
          className={`score-frame${fillScore ? " is-filled" : ""}${score > 0 ? " has-score" : ""}`}
          role="img"
          aria-label={`You answered ${score} out of ${QUIZ_LENGTH} correctly`}
          style={
            {
              "--score-height": `${score * 10}%`,
            } as React.CSSProperties
          }
        />

        <p className={`score-value${score > 8 ? " is-high-score" : ""}`}>
          Your score: <span>{displayedScore}</span>
        </p>

        {score >= 6 && displayedScore === score && (
          <section className="birthday-celebration" aria-label="Birthday celebration">
            <img src="/bouquet.png" alt="A colorful birthday bouquet" />
            <p>Happy birthday!🫶🥳</p>
          </section>
        )}

        {showResultCopy && (
          <section className="result-copy">
            {score <= 5 && (
              <p className="result-message">Are you sure your name is Signe?!👀</p>
            )}
            <button className="play-again" type="button" onClick={playAgain}>
              Play again
            </button>
          </section>
        )}
      </main>
    );
  }

  return (
    <main
      className={`quiz${isWrongAnswer ? " is-ringing" : ""}`}
      aria-labelledby="quiz-prompt"
    >
      {loadError ? (
        <section className="load-state" role="alert">
          <p>The lyrics could not be loaded.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </section>
      ) : !currentLyric ? (
        <p className="load-state" aria-live="polite">
          Gathering the lines…
        </p>
      ) : (
        <section className="quiz-stage">
          <button
            className="artist-choice artist-choice-john"
            type="button"
            onClick={() => answer("john")}
            disabled={isChanging}
            aria-label="Choose John Mayer"
          >
            <span className="portrait-wrap">
              <img src="/john.svg" alt="John Mayer" />
            </span>
          </button>

          <div
            className={`lyric-panel${isChanging ? " is-changing" : ""}`}
            key={questionIndex}
          >
            <blockquote id="quiz-prompt">“{currentLyric.line}”</blockquote>
          </div>

          <button
            className="artist-choice artist-choice-kacey"
            type="button"
            onClick={() => answer("kacey")}
            disabled={isChanging}
            aria-label="Choose Kacey Musgraves"
          >
            <span className="portrait-wrap">
              <img src="/kasey.svg" alt="Kacey Musgraves" />
            </span>
          </button>
        </section>
      )}
    </main>
  );
}
