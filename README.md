# pommu-toolkit

DLsiteのSNS「Pommu」(`ch.dlsite.com/pommu`)向けのTampermonkeyユーザースクリプト集です。

> 非公式のスクリプトです。DLsiteおよびPommuとは関係ありません。サイトの仕様変更で動かなくなることがあります。

## インストール

1. ブラウザに [Tampermonkey](https://www.tampermonkey.net/) を入れる
2. 下のリンクを開き、表示される画面で「インストール」を押す

**[pommu-toolkit.user.js をインストール](https://raw.githubusercontent.com/4STRA1/pommu-toolkit/main/pommu-toolkit.user.js)**

`@updateURL` を設定してあるので、以降の更新はTampermonkeyが自動で取得します。

## pommu-toolkit.user.js

小さな機能を1本にまとめたスクリプトです。各機能はTampermonkeyのメニューから個別にON/OFFできます。

| 機能 | 内容 |
| --- | --- |
| R18画像のみ表示 | タイムラインを「R18かつ画像付き」の投稿だけに絞り込みます。「R18投稿表示」トグルの上にスイッチが追加されます |
| YouTubeタイトル自動入力 | 投稿画面でYouTubeリンクを貼ると、動画タイトルをリンクの直前に自動で入力します |
| 動画埋め込み | 投稿内のYouTube/ニコニコ動画のリンクを再生ウィンドウとして埋め込みます。複数ある場合はタブで切り替え、タップで読み込みます |
| Xポスト埋め込み | 投稿内のx.com(twitter.com)のポストリンクを埋め込み表示します。引用リポストは引用部分も表示し、長文は折りたたみます |

### ON/OFFの切り替え

Tampermonkeyのメニューに、機能ごとに `✅`(ON)/ `⬜`(OFF)付きの項目が並びます。押すと切り替わり、ページがリロードされます。初期状態はすべてONです。

R18画像のみ表示は、サイト上に追加されるスイッチでも切り替えられます。

### 外部サービスへの通信

| 機能 | 通信先 | 用途 |
| --- | --- | --- |
| YouTubeタイトル自動入力 | `www.youtube.com`(oEmbed) | 動画タイトルの取得 |
| Xポスト埋め込み | `api.fxtwitter.com` | ポスト内容の取得(サードパーティのAPIです) |
| 動画埋め込み | `youtube-nocookie.com` / `embed.nicovideo.jp` | 再生プレイヤー(タップした時だけ読み込み) |

## 関連スクリプト

- [pommu-tl-auto-refresh](https://github.com/4STRA1/pommu-tl-auto-refresh): タイムラインの自動更新(規模が大きいため別スクリプトのままです)

## 以前の単体スクリプトからの移行

次のスクリプトは `pommu-toolkit` に統合済みです。**併用すると二重に動くので、無効化または削除してください。**

- PommuR18imgView
- Pommu YouTubeタイトル自動入力
- Pommu 動画埋め込み(YouTube/ニコニコ)
- Pommu X Embed

## 不具合報告

[Issues](https://github.com/4STRA1/pommu-toolkit/issues) にお願いします。

## ライセンス

MIT
