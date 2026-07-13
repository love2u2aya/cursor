import type { ContextCard } from "@/lib/api";

interface Props {
  cards: ContextCard[];
  summary?: string;
  decisions?: string[];
  openQuestions?: string[];
}

const typeLabel: Record<ContextCard["type"], string> = {
  knowledge: "ナレッジ",
  summary: "要約",
  action: "アクション",
};

export function ContextCards({ cards, summary, decisions, openQuestions }: Props) {
  return (
    <section className="panel">
      <h2>関連情報</h2>
      <div className="panel-body scrollable">
        {summary && (
          <div className="highlight-box">
            <h3>会話の要約</h3>
            <p>{summary}</p>
          </div>
        )}

        {decisions && decisions.length > 0 && (
          <div className="list-box">
            <h3>決定事項</h3>
            <ul>
              {decisions.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {openQuestions && openQuestions.length > 0 && (
          <div className="list-box">
            <h3>未解決の質問</h3>
            <ul>
              {openQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        {cards.length === 0 ? (
          <p className="muted">会話内容に応じて関連ナレッジが表示されます。</p>
        ) : (
          <div className="card-grid">
            {cards.map((card) => (
              <article key={card.id} className={`context-card type-${card.type}`}>
                <header>
                  <span className="badge">{typeLabel[card.type]}</span>
                  <h3>{card.title}</h3>
                </header>
                <p>{card.body}</p>
                {card.sources.length > 0 && (
                  <footer>出典: {card.sources.join(", ")}</footer>
                )}
                <div className="score">関連度: {Math.round(card.relevance_score * 100)}%</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
