const { createApp } = Vue;

// 词库
let DICT = new Set();
fetch("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt")
  .then(r => r.text())
  .then(t => DICT = new Set(t.split("\n").map(w => w.trim().toLowerCase())));

createApp({
  data: () => ({
    peer: null,
    conn: null,
    myId: "",
    roomToJoin: "",
    history: [],
    word: "",
    myTurn: false,
    peerCnt: 1,
    winner: null,
    status: "正在连接服务器..."
  }),
  mounted() {
    // 公共中继 1
    this.peer = new Peer({ host: "peerjs.mmediagroup.fr", port: 443, secure: true });
    this.peer.on("open", id => {
      this.myId = id;
      this.status = "已连接，可创建或加入房间";
    });
    this.peer.on("connection", c => this.setupConn(c));
    this.peer.on("error", e => {
      this.status = "连接失败，请换 4G/5G 或刷新重试";
      console.error(e);
    });
  },
  methods: {
    createRoom() {
      this.myTurn = true;
      this.status = "房间已创建，把上面 ID 发给对方";
    },
    joinRoom() {
      if (!this.roomToJoin) return;
      this.conn = this.peer.connect(this.roomToJoin.trim());
      this.setupConn(this.conn);
      this.status = "正在加入...";
    },
    setupConn(c) {
      this.conn = c;
      this.conn.on("open", () => {
        this.peerCnt = 2;
        this.status = "对方已连接！";
        this.conn.on("data", msg => {
          msg = JSON.parse(msg);
          if (msg.type === "word") {
            this.history.push(msg.word);
            this.myTurn = true;
          } else if (msg.type === "win") {
            this.winner = msg.id;
          }
        });
      });
    },
    submitWord() {
      const w = this.word.trim().toLowerCase();
      if (!w) return;
      const last = this.history.length ? this.history.at(-1).slice(-1) : "";
      if ((last && w[0] !== last) || this.history.includes(w) || !DICT.has(w)) {
        alert("不合法！");
        return;
      }
      this.history.push(w);
      this.word = "";
      this.myTurn = false;
      this.conn.send(JSON.stringify({ type: "word", word: w }));
      const next = w.slice(-1);
      const remain = [...DICT].filter(d => d.startsWith(next) && !this.history.includes(d));
      if (remain.length === 0) {
        this.winner = this.myId;
        this.conn.send(JSON.stringify({ type: "win", id: this.myId }));
      }
    }
  }
}).mount("#app");
