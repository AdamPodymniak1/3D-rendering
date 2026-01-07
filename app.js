const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"

game.width = 800
game.height = 800

const ctx = game.getContext("2d")

function clear(){
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, game.width, game.height)
}

function screen(p){
    return {
        x: (p.x + 1) * 0.5 * game.width,
        y: (1 - (p.y + 1) * 0.5) * game.height
    }
}

function project({x, y, z}){
    return { x: x / z, y: y / z }
}

function line(p1, p2){
    ctx.lineWidth = 2
    ctx.strokeStyle = FOREGROUND
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
}

function translate({x, y, z}, t){
    return { x: x + t.x, y: y + t.y, z: z + t.z }
}

function translate_z({x, y, z}, dz){
    return { x, y, z: z + dz }
}

function rotate_xz({x, y, z}, a){
    const c = Math.cos(a)
    const s = Math.sin(a)
    return { x: x*c - z*s, y, z: x*s + z*c }
}

function rotate_yz({x, y, z}, a){
    const c = Math.cos(a)
    const s = Math.sin(a)
    return { x, y: y*c - z*s, z: y*s + z*c }
}

function rotate_xy({x, y, z}, a){
    const c = Math.cos(a)
    const s = Math.sin(a)
    return { x: x*c - y*s, y: x*s + y*c, z }
}

const camera = {
    pos: { x: 0, y: 0, z: -3 },
    yaw: 0,
    pitch: 0
}

function to_camera(p){
    let v = translate(p, {
        x: -camera.pos.x,
        y: -camera.pos.y,
        z: -camera.pos.z
    })

    v = rotate_xz(v, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)

    return v
}

function draw_line(a, b){
    a = to_camera(a)
    b = to_camera(b)

    if (a.z <= 0 || b.z <= 0) return

    line(
        screen(project(a)),
        screen(project(b))
    )
}

const figures = []

function add_cube(center, s){
    const h = s * 0.5
    figures.push({
        type: "cube",
        center,
        vs: [
            {x:-h,y:-h,z:-h},{x:h,y:-h,z:-h},{x:h,y:h,z:-h},{x:-h,y:h,z:-h},
            {x:-h,y:-h,z:h},{x:h,y:-h,z:h},{x:h,y:h,z:h},{x:-h,y:h,z:h}
        ]
    })
}

function add_pyramid(center, s, h){
    const hs = s * 0.5
    figures.push({
        type: "pyramid",
        center,
        vs: [
            {x:-hs,y:-hs,z:0},{x:hs,y:-hs,z:0},
            {x:hs,y:hs,z:0},{x:-hs,y:hs,z:0},
            {x:0,y:0,z:h}
        ]
    })
}

function add_prism(center, r, h, steps){
    const vs = []
    for(let i=0;i<steps;i++){
        const a = i/steps * Math.PI*2
        vs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,z:-h*0.5})
        vs.push({x:Math.cos(a)*r,y:Math.sin(a)*r,z:h*0.5})
    }
    figures.push({
        type: "prism",
        center,
        vs,
        steps
    })
}

const keys = {}

window.addEventListener("keydown", e => keys[e.key] = true)
window.addEventListener("keyup", e => keys[e.key] = false)

let mouseDown = false
let lastMouseX = 0
let lastMouseY = 0

game.addEventListener("mousedown", e => {
    mouseDown = true
    lastMouseX = e.clientX
    lastMouseY = e.clientY
})

window.addEventListener("mouseup", () => {
    mouseDown = false
})

window.addEventListener("mousemove", e => {
    if(!mouseDown) return

    const dx = e.clientX - lastMouseX
    const dy = e.clientY - lastMouseY

    lastMouseX = e.clientX
    lastMouseY = e.clientY

    const sensitivity = 0.003

    camera.yaw   -= dx * sensitivity
    camera.pitch -= dy * sensitivity

    camera.pitch = Math.max(
        -Math.PI/2 + 0.001,
         Math.min(Math.PI/2 - 0.001, camera.pitch)
    )
})

const FPS = 60

function frame(){
    clear()

    const move = 0.05

    let mv = { x: 0, y: 0, z: 0 }

    if(keys["w"]) mv.z += move
    if(keys["s"]) mv.z -= move
    if(keys["a"]) mv.x -= move
    if(keys["d"]) mv.x += move

    if(keys[" "])     mv.y += move
    if(keys["Shift"]) mv.y -= move

    mv = rotate_yz(mv, camera.pitch)
    mv = rotate_xz(mv, camera.yaw)

    camera.pos.x += mv.x
    camera.pos.y += mv.y
    camera.pos.z += mv.z

    for(const f of figures){
        const v = f.vs.map(p =>
            translate(
                translate_z(p, 2),
                f.center
            )
        )

        if(f.type === "cube"){
            const e = [
                [0,1],[1,2],[2,3],[3,0],
                [4,5],[5,6],[6,7],[7,4],
                [0,4],[1,5],[2,6],[3,7]
            ]
            for(const [i,j] of e) draw_line(v[i], v[j])
        }

        if(f.type === "pyramid"){
            const e = [
                [0,1],[1,2],[2,3],[3,0],
                [0,4],[1,4],[2,4],[3,4]
            ]
            for(const [i,j] of e) draw_line(v[i], v[j])
        }

        if(f.type === "prism"){
            for(let i=0;i<f.steps;i++){
                const a = i*2
                const b = ((i+1)%f.steps)*2
                draw_line(v[a], v[b])
                draw_line(v[a+1], v[b+1])
                draw_line(v[a], v[a+1])
            }
        }
    }

    setTimeout(frame, 1000 / FPS)
}

add_cube({x:-0.7,y:0,z:0}, 0.5)
add_pyramid({x:0.7,y:0,z:0}, 0.4, 0.5)
add_prism({x:0,y:0,z:0}, 0.25, 0.5, 16)

setTimeout(frame, 1000 / FPS)
