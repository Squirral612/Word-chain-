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
    winner: null
  }),
  mounted() {
    // 使用公共中继
    this.peer = new Peer({ host: "peerjs.mmediagroup.fr", port: 443, secure: true });
    this.peer.on("open", id => this.myId = id);
    this.peer.on("connection", c => this.setupConn(c));
  },
  methods: {
    createRoom() {
      this.myTurn = true;
      // 等待对方连接
    },
    joinRoom() {
      if (!this.roomToJoin) return;
      this.conn = this.peer.connect(this.roomToJoin.trim());
      this.setupConn(this.conn);
    },
    setupConn(c) {
      this.conn = c;
      this.conn.on("open", () => {
        this.peerCnt = 2;
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
      // 检查对方还能不能接
      const next = w.slice(-1);
      const remain = [...DICT].filter(d => d.startsWith(next) && !this.history.includes(d));
      if (remain.length === 0) {
        this.winner = this.myId;
        this.conn.send(JSON.stringify({ type: "win", id: this.myId }));
      }
    }
  }
}).mount("#app");
