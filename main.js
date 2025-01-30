import Hyperbeam from "@hyperbeam/web"

window.onload = () => {
  window.parent.postMessage({status: "loaded"}, "*");

  let embedURL = "" // Running locally and you have an embed URL? Set it here
  if (embedURL === "") {
    console.log("CHOOSING ROOM");
    window.addEventListener('message', async function(event) {
        console.log("Message received from the parent: " + event.data);
        if(event.data.sender === "Verse") {
            let eventData = event.data.message;
            console.log("VERSE ROOM RECEIVED: ", eventData)
            const room = eventData;
            const req = await fetch("https://demo-api.tutturu.workers.dev/" + room)
            if (req.status >= 400) {
                alert("We are out of demo servers! Visit hyperbeam.dev to get your own API key")
                return
            }
            const body = await req.json()
            console.log("BODY.ROOM: ", body.room)
            console.log("ROOM: ", room)
            if (body.room !== room) {
                window.parent.postMessage({sender: "Verse", message: body.room}, "*");
                window.parent.postMessage({sender: "Verse-Browser-URL", message: body.url}, "*");
                embedURL = body.url
                window.location = embedURL;
            } else {
                window.parent.postMessage({sender: "Verse-Browser-URL", message: body.url}, "*");
                embedURL = body.url
                window.location = embedURL;
            }
        }
        if(event.data.sender === "Party") {
            let eventData = event.data.message;
            console.log("PARTY MSG RECEIVED: ", eventData)
        }
    });
  }
}

async function main(embedURL) {
  // Get the container for the Hyperbeam iframe
  const hbcontainer = document.getElementById("hbcontainer");

  const hb = await Hyperbeam(hbcontainer, embedURL, {
    frameCb: (frame) => {
      if (frame.constructor === HTMLVideoElement) {
        // Adjust video to fit mobile screens
        frame.style.width = "100%";
        frame.style.height = "auto";
        frame.style.maxWidth = "100%";
      }
    },
    audioTrackCb: tryAudio
  });

  // Responsive handling for mobile screens
  function adjustVideoForMobile() {
    const videoElement = hbcontainer.querySelector("video");
    if (videoElement) {
      videoElement.style.width = "100%";
      videoElement.style.height = "auto";
      videoElement.style.maxWidth = "100%";
    }
  }

  // On window resize, adjust the video size
  window.addEventListener("resize", adjustVideoForMobile);
  
  // Initial adjustment
  adjustVideoForMobile();

  // Audio handling
  function tryAudio(track) {
    const listener = new THREE.AudioListener();
    const sound = new THREE.PositionalAudio(listener);
    sound.setMediaStreamSource(new MediaStream([track]));
    sound.setRefDistance(0.5);
  }
}
