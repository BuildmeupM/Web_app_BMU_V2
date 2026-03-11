import fetch from 'node-fetch'

async function run() {
    try {
        const res = await fetch('http://localhost:3001/api/document-entry-work/491/2026/2', {
            headers: {
                // Not passing auth to see if we get 401, or if we need to mock it in the backend
            }
        })
        const text = await res.text()
        console.log("Status:", res.status)
        console.log("Body:", text)
    } catch (e) {
        console.error(e)
    }
}
run()
