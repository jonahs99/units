export class Connection {
	constructor(ws) {
		this.ws = ws
	}

	send(msg) {
		this.ws.send(JSON.stringify(msg))
	}

	on(fn) {
		this.ws.addEventListener('message', (e) => {
			const msg = JSON.parse(e.data)
			fn(msg)
		})
	}
}

export async function connect_to_server(room) {
	return new Promise((resolve, reject) => {
		const url = `ws://${location.host}/socket/${room}`
		const ws = new WebSocket(url)
		ws.addEventListener('open', () => {
			const con = new Connection(ws)
			resolve(con)
		})
	})
}

