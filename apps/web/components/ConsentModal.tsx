interface Props {
  onAccept: () => void;
}

export function ConsentModal({ onAccept }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>録音・文字起こしの同意</h2>
        <p>
          このツールは会議の音声を文字起こしし、関連情報を表示します。
          会議参加者全員の同意を得た上でご利用ください。
        </p>
        <ul>
          <li>音声データは文字起こし処理のためにサーバーへ送信されます</li>
          <li>処理には約30〜60秒の遅延があります</li>
          <li>セッション終了後、議事録をエクスポートできます</li>
        </ul>
        <button className="btn primary" onClick={onAccept}>
          同意して開始
        </button>
      </div>
    </div>
  );
}
