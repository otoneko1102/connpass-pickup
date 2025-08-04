# connpass pickup
https://connpass.com/ のイベントの参加枠のメンバーをランダムに並び替えるツールです。  
結果の表示はコンソールとhtmlに書き出してブラウザで表示します。  
LTなどの発表会の発表順を決める際にどうぞ。

## Warning
> `npm install -g connpass-pickup@latest` で新しいバージョンをインストールすると、パッケージが上書きされて更新されるので `results/` 内のhtmlがすべて削除されます。

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
このような使い方も可能です:
```bash
pickup 000000
```
```bash
pickup https://connpass.com/event/000000/
```
```bash
pickup https://example.connpass.com/event/000000/
```

#### Git Install (legacy)
```bash
git clone https://github.com/otoneko1102/connpass-pickup.git
cd connpass-pickup
npm install
npm run pickup
```
このような使い方も可能です:
```bash
npm run pickup 000000
```
```bash
npm run pickup https://connpass.com/event/000000/
```
```bash
npm run pickup https://example.connpass.com/event/000000/
```

### Sample
[here](https://github.com/otoneko1102/connpass-pickup/tree/main/results/eventId_currentTime.html)

## 免責事項
本ツール（以下、ツール）は実験目的で作成・公開されました。  
ツールの使用を推奨しません。  
ツールを使用して発生した損害に関しては一切責任を負いません。
