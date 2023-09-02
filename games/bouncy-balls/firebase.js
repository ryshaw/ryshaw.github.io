/*import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  child,
  get,
  set,
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const appSettings = {
  databaseURL: "",
};

const database = ref(getDatabase(initializeApp(appSettings)));

onValue(database, function (snapshot) {
  if (snapshot.exists()) {
    //console.log(Object.values(snapshot.val()));
  }
});

window.addEventListener("updateGameData", () => {
  //push(gameData, localStorage.getItem("colorTheme"));
});

window.addEventListener("startPlaySession", () => {
  // get the last play session, grab the number at the end, and add one to it
  // e.g. if the database's last play session is "play session 16",
  // then add "play session 17" and write the rest of the game's data to it
  get(child(database, "gameData"))
    .then((snapshot) => {
      if (snapshot.exists()) {
        const playSessions = Object.keys(snapshot.val());
        // playSessions = ['play-session-1', 'play-session-2', ...]
        let newPlaySession = "play-session-";

        // if we already have previous play sessions
        if (playSessions.length > 0) {
          const lastPlaySession = playSessions[playSessions.length - 1];
          // lastPlaySession = "play-session-5" or something like that
          let newNumber = Number(lastPlaySession.split("-")[2]) + 1;
          newPlaySession += newNumber;
          // now newPlaySession = "play-session-6" or whatever
        } else {
          newPlaySession += "1";
          // newPlaySession = "play-session-1" since we're just starting
        }

        // add our new play session, with blank data, to the database
        set(child(database, "gameData/" + newPlaySession), {
          timePlayed: 0,
          level: localStorage.getItem("level"),
          colorTheme: localStorage.getItem("colorTheme"),
        });
      } else {
        console.log("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
    });
});*/
