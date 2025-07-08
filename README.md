# connpass pickup
https://connpass.com/ のイベントの参加枠のメンバーをランダムに並び替えするツールです。  
結果の表示はコンソールとhtmlに書き出してブラウザで表示します。  
LTなどの発表会の発表順を決める際にどうぞ。  
WindowsのVSCode上でのみ動作確認をしました。

## Start
### Required
```bash
node -v # 22.14.0
npm -v # 10.9.2
```

### Usage
```bash
git clone https://github.com/otoneko1102/connpass-pickup.git
cd connpass-pickup
npm install
npm run pickup
```

### Sample
[here](https://github.com/otoneko1102/connpass-pickup/tree/main/results/eventId_currentTime.html)
