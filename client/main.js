import {connect_to_server} from './server.js'


async function main() {
	document.body.innerHTML += '<p>Opening connection...</p>'
	const con = await connect_to_server('room')

	let client

	con.on((msg) => {
		const { Room, Update } = msg
		if (Room) {
			document.body.innerHTML += `<p>We are client: ${Room.client_id} in room "${Room.room}"</p>`
			document.body.innerHTML += `<pre></pre>`
			client = Room.client_id
		} else if (Update) {
			document.querySelector('pre').innerHTML = 'Last message:\n' + JSON.stringify(Update, null, '  ')

			con.send({
				Commands: [
					{ id: 0, target: { x: 10, y: 0 } },
				],
			})
		}
	})

	document.body.innerHTML += '<p>Connected.</p>'
}

main()

