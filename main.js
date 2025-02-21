import "./style.css"
import * as THREE from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {FontLoader} from "three/examples/jsm/loaders/FontLoader"
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry"
import fontURL from "./fonts/helvetiker_regular.typeface.json?url"

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
					//main(embedURL, "new")
				} else {
					window.parent.postMessage({sender: "Verse-Browser-URL", message: body.url}, "*");
					embedURL = body.url
					window.location = embedURL;
					//main(embedURL, "old")
				}
            }
			if(event.data.sender === "Party") {
				let eventData = event.data.message;
                console.log("PARTY MSG RECEIVED: ", eventData)
			}
        });
	}

}

async function main(embedURL, status) {
	const scene = new THREE.Scene()
	const pointer = new THREE.Vector2()
	const raycaster = new THREE.Raycaster()
	const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, .0001, 100)
	camera.position.set(0, 0.2, 0.45)

	const listener = new THREE.AudioListener()
	const sound = new THREE.PositionalAudio(listener)
	camera.add(listener)

	const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !true, alpha: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setClearColor(0xFF889B, 0)
	renderer.setSize(window.innerWidth, window.innerHeight)
	threejscontainer.appendChild(renderer.domElement)

	const controls = new OrbitControls(camera, renderer.domElement)
	controls.target.set(0, 0.2, 0)
	controls.zoomSpeed = 0.25;
	
	const width = 0.62
	const height = width * 9 / 16
	const texture = new THREE.Texture()

	texture.flipY = false
	texture.generateMipmaps = false

	const geometry = new THREE.PlaneBufferGeometry(width, height)
	const material = new THREE.MeshBasicMaterial({ map: texture })

	geometry.rotateZ(Math.PI)
	geometry.rotateY(Math.PI)
	material.side = THREE.DoubleSide

	const plane = new THREE.Mesh(geometry, material)
	plane.translateY(height / 2 + 0.04)
	scene.add(plane)
	plane.add(sound)
	plane.position.y -= 0.015;
	//plane.position.z += 0.1;

	function loadFont() {
		const loader = new FontLoader();
		loader.load( fontURL, function ( response ) {
			font = response;
			createText();
		} );
	}

	function onKeyDown(event) {
		switch (event.key) {
			case "ArrowUp":
				plane.position.y += 0.01;
				break;
			case "ArrowDown":
				plane.position.y -= 0.01;
				break;
			case "ArrowLeft":
				plane.position.x -= 0.01;
				break;
			case "ArrowRight":
				plane.position.x += 0.01;
				break;
		}
	}
	
	// Event listener for key presses
	window.addEventListener("keydown", onKeyDown);

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

	if(status === "new") {
		hb.tabs.remove();
		hb.tabs.update({url: "https://totl.us/verse/dashboard"});
	}

	window.addEventListener("resize", onWindowResized)
	window.addEventListener("wheel", onWheel)
	window.addEventListener("contextmenu", onContextMenu)
	window.addEventListener("pointermove", onPointerMove)
	window.addEventListener("pointerdown", onPointerDown)
	window.addEventListener("pointerup", onPointerUp)

	setStartURL()
	onWindowResized()
	animate()

	function tryAudio(track) {
		sound.setMediaStreamSource(new MediaStream([track]))
		sound.setRefDistance(0.5)
	}

	function onWindowResized() {
		const w = window.innerWidth
		const h = window.innerHeight
		renderer.setSize(w, h)
		camera.aspect = w / h
		camera.updateProjectionMatrix()
	}

	function getPlaneIntersects() {
		raycaster.setFromCamera(pointer, camera)
		return raycaster.intersectObject(plane, false)
	}

	function onWheel(e) {
		if (getPlaneIntersects().length > 0) {
			hb.sendEvent({
				type: "wheel",
				deltaY: e.deltaY,
			})
		}
	}

	function onContextMenu(e) {
		if (getPlaneIntersects().length > 0) {
			e.preventDefault()
		}
	}

	function handlePointer(e, type) {
		pointer.x = (e.clientX / window.innerWidth) * 2 - 1
		pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
		const intersects = getPlaneIntersects()
		if (intersects.length > 0) {
			controls.enabled = false;
			controls.enableZoom = false;
			const vector = new THREE.Vector3().copy(intersects[0].point)
			plane.worldToLocal(vector)
			hb.sendEvent({
				type,
				x: vector.x / width + 0.5,
				y: -vector.y / height + 0.5,
				button: e.button
			})
		} else {
			controls.enabled = true;
			controls.enableZoom = true;
		}
	}

	function onPointerMove(e) {
		handlePointer(e, "mousemove")
	}

	function onPointerDown(e) {
		handlePointer(e, "mousedown")
	}

	async function onPointerUp(e) {
		handlePointer(e, "mouseup")
		if (listener.context.state === "suspended") {
			await listener.context.resume()
		}
	}

	function animate() {
		window.requestAnimationFrame(animate)
		controls.update()
		renderer.render(scene, camera)
	}

	function setStartURL() {
		const params = new URLSearchParams(location.search)
		const startURL = params.get('url')
		if (startURL) {
			hb.tabs.update({url: startURL})
		}
	}
}
