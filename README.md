# connpass pickup
https://connpass.com/ のイベントの参加枠のメンバーをランダムに並び替えるツールです。  
結果の表示はコンソールとhtmlに書き出してブラウザで表示します。  
LTなどの発表会の発表順を決める際にどうぞ。

## Start
### Required
```bash
node -v # 22.14.0
npm -v # 10.9.2
```

### Usage

#### NPM Install (latest)
```bash
npm install -g connpass-pickup@latest
pickup
```

#### Git Install (legacy)
```bash
git clone https://github.com/otoneko1102/connpass-pickup.git
cd connpass-pickup
npm install
npm run pickup
```

### Sample
[here](https://github.com/otoneko1102/connpass-pickup/tree/main/results/eventId_currentTime.html)
