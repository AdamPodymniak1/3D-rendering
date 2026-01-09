const BACKGROUND = "#101010"
const FOREGROUND = "#50FF50"
const LINES = "#005f00ff"
const FILL = "#11aa33"
const GRAVITY = -0.01
const GROUND_Y = -0.8
const DAMPING = 0.4
const FRICTION = 0.92
const RESTITUTION = 0.3
const STOP_EPS = 0.02
const NEAR = 0.1
const SNAP_VEL_Y = 0.01
const SNAP_VEL_XZ = 0.02
const SNAP_ANGLE = 0.05

game.width = 800
game.height = 800

const ctx = game.getContext("2d")

function clear(){
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, game.width, game.height)
}

function screen(p){
    return { x: (p.x+1)*0.5*game.width, y: (1-(p.y+1)*0.5)*game.height }
}

function project({x, y, z}){
    return { x:x/z, y:y/z, z }
}

function translate({x, y, z}, t){
    return { x:x+t.x, y:y+t.y, z:z+t.z }
}

function translate_z({x, y, z}, dz){
    return { x, y, z:z+dz }
}

function rotate_xz({x, y, z}, a){
    const c=Math.cos(a), s=Math.sin(a)
    return { x:x*c-z*s, y, z:x*s+z*c }
}

function rotate_yz({x, y, z}, a){
    const c=Math.cos(a), s=Math.sin(a)
    return { x, y:y*c-z*s, z:y*s+z*c }
}

function dot(a,b){ return a.x*b.x+a.y*b.y+a.z*b.z }
function sub(a,b){ return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z} }
function cross(a,b){
    return {
        x:a.y*b.z-a.z*b.y,
        y:a.z*b.x-a.x*b.z,
        z:a.x*b.y-a.y*b.x
    }
}
function normalize(v){
    const l=Math.hypot(v.x,v.y,v.z)
    return {x:v.x/l,y:v.y/l,z:v.z/l}
}

function clip_edge(a, b){
    const t = (NEAR - a.z) / (b.z - a.z)
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: NEAR
    }
}

function clip_triangle(pts){
    const inside = pts.filter(p => p.z >= NEAR)
    const outside = pts.filter(p => p.z < NEAR)

    if (inside.length === 0) return []
    if (inside.length === 3) return [pts]

    if (inside.length === 1){
        const a = inside[0]
        const b = clip_edge(a, outside[0])
        const c = clip_edge(a, outside[1])
        return [[a, b, c]]
    }

    if (inside.length === 2){
        const [a, b] = inside
        const c = clip_edge(a, outside[0])
        const d = clip_edge(b, outside[0])
        return [[a, b, c], [b, d, c]]
    }
}

const camera = { pos:{x:0,y:0,z:-3}, yaw:0, pitch:0 }
const lightDir = normalize({x: 0.5,y:0.5,z:-0.5})

function to_camera(p){
    let v = translate(p, { x:-camera.pos.x, y:-camera.pos.y, z:-camera.pos.z })
    v = rotate_xz(v, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)
    return v
}

let drawLines=false
let drawTextures=false
let drawLighting=false
let drawPhysics = false

toggleLines.onclick=()=>drawLines=!drawLines
toggleTextures.onclick=()=>drawTextures=!drawTextures
toggleLighting.onclick=()=>drawLighting=!drawLighting
togglePhysics.onclick = () => drawPhysics = !drawPhysics
resetPos.onclick = () => {
    for(const f of figures){
        f.center = {...f.originalCenter}
        f.vel = {x:0,y:0,z:0}
        f.ang = null
    }
}
pushAll.onclick = () => {
    for(const f of figures){
        if(!isFinite(f.mass)) continue

        f.vel.x += (Math.random() - 0.5) * 0.2
        f.vel.y += 0.1
        f.vel.z += (Math.random() - 0.5) * 0.2
    }
}

function draw_textured_triangle(ctx, img, p0, p1, p2, uv0, uv1, uv2){
    const x0=p0.x,y0=p0.y,x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y
    const u0=uv0.x*img.width,v0=uv0.y*img.height
    const u1=uv1.x*img.width,v1=uv1.y*img.height
    const u2=uv2.x*img.width,v2=uv2.y*img.height
    const denom=(u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1))
    if(!denom) return
    const a=(x0*(v1-v2)+x1*(v2-v0)+x2*(v0-v1))/denom
    const b=(y0*(v1-v2)+y1*(v2-v0)+y2*(v0-v1))/denom
    const c=(x0*(u2-u1)+x1*(u0-u2)+x2*(u1-u0))/denom
    const d=(y0*(u2-u1)+y1*(u0-u2)+y2*(u1-u0))/denom
    const e=x0-a*u0-c*v0
    const f=y0-b*u0-d*v0
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x0,y0)
    ctx.lineTo(x1,y1)
    ctx.lineTo(x2,y2)
    ctx.closePath()
    ctx.clip()
    ctx.setTransform(a,b,c,d,e,f)
    ctx.drawImage(img,0,0)
    ctx.setTransform(1,0,0,1,0,0)
    ctx.restore()
}

function draw_polygon(points, uvs, texture, light, color){
    for(let i=0;i<points.length-2;i++){
        if(drawTextures && texture){
            draw_textured_triangle(
                ctx,texture,
                points[0],points[i+1],points[i+2],
                uvs[0],uvs[i+1],uvs[i+2]
            )
            if(drawLighting){
                ctx.fillStyle=`rgba(0,0,0,${1-light})`
                ctx.beginPath()
                ctx.moveTo(points[0].x,points[0].y)
                ctx.lineTo(points[i+1].x,points[i+1].y)
                ctx.lineTo(points[i+2].x,points[i+2].y)
                ctx.closePath()
                ctx.fill()
            }
        }else{
            let fillColor
            if(color) fillColor = color
            else {
                const g=Math.floor(255*light)
                fillColor = `rgb(${g*0.3},${g},${g*0.3})`
            }
            ctx.fillStyle = fillColor
            ctx.beginPath()
            ctx.moveTo(points[0].x,points[0].y)
            ctx.lineTo(points[i+1].x,points[i+1].y)
            ctx.lineTo(points[i+2].x,points[i+2].y)
            ctx.closePath()
            ctx.fill()
        }
    }
    if(drawLines){
        ctx.strokeStyle=LINES
        ctx.beginPath()
        ctx.moveTo(points[0].x,points[0].y)
        for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y)
        ctx.closePath()
        ctx.stroke()
    }
}

const figures=[]

function add_cube(center,s){
    const h=s/2
    const vs=[
        {x:-h,y:-h,z:-h},{x:h,y:-h,z:-h},{x:h,y:h,z:-h},{x:-h,y:h,z:-h},
        {x:-h,y:-h,z:h},{x:h,y:-h,z:h},{x:h,y:h,z:h},{x:-h,y:h,z:h}
    ]
    const faces=[[0,1,2,3],[4,5,6,7],[0,4,5,1],[3,7,6,2],[1,5,6,2],[0,4,7,3]]
    const tris=[]
    for(const f of faces){
        const uv=[{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}]
        tris.push(
            {indices:[f[0],f[1],f[2]],uvs:[uv[0],uv[1],uv[2]]},
            {indices:[f[0],f[2],f[3]],uvs:[uv[0],uv[2],uv[3]]}
        )
    }
    figures.push({
        center,
        originalCenter: {...center},
        vs,
        faces: tris,
        vel: { x:0, y:0, z:0 },
        mass: 1,
        radius: s * 0.75
    })
}

function add_pyramid(center,s,h){
    const hs=s/2,hh=h/2
    const vs=[
        {x:-hs,y:-hh,z:-hs},{x:hs,y:-hh,z:-hs},
        {x:hs,y:-hh,z:hs},{x:-hs,y:-hh,z:hs},
        {x:0,y:hh,z:0}
    ]
    const faces=[
        {indices:[0,1,2],uvs:[{x:0,y:1},{x:1,y:1},{x:1,y:0}]},
        {indices:[0,2,3],uvs:[{x:0,y:1},{x:1,y:0},{x:0,y:0}]}
    ]
    for(let i=0;i<4;i++)
        faces.push({indices:[i,(i+1)%4,4],uvs:[{x:0,y:1},{x:1,y:1},{x:.5,y:0}]})
    figures.push({
        center,
        originalCenter: {...center},
        vs,
        faces,
        vel: { x:0, y:0, z:0 },
        mass: 1,
        radius: s * 0.75
    })
}

function sphereUV(u,v){
    return {x:(u-0.25+1)%1,y:v}
}

function add_sphere(center,r,lat=12,lon=20){
    const vs=[],faces=[]
    for(let i=0;i<=lat;i++){
        for(let j=0;j<=lon;j++){
            const u=j/lon,v=i/lat
            const phi=v*Math.PI,theta=u*Math.PI*2
            vs.push({
                x:Math.sin(phi)*Math.cos(theta)*r,
                y:Math.cos(phi)*r,
                z:Math.sin(phi)*Math.sin(theta)*r,
                u,v
            })
        }
    }
    const row=lon+1
    for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
        const a=i*row+j,b=a+row
        faces.push({
            indices:[a,b,a+1],
            uvs:[sphereUV(vs[a].u,vs[a].v),sphereUV(vs[b].u,vs[b].v),sphereUV(vs[a+1].u,vs[a+1].v)]
        })
        faces.push({
            indices:[a+1,b,b+1],
            uvs:[sphereUV(vs[a+1].u,vs[a+1].v),sphereUV(vs[b].u,vs[b].v),sphereUV(vs[b+1].u,vs[b+1].v)]
        })
    }
    figures.push({
        center,
        originalCenter: {...center},
        vs,
        faces,
        vel: { x:0, y:0, z:0 },
        mass: 1,
        radius: r
    })
}

function add_ground(){
    const size = 20
    const vs = [
        {x:-size, y:GROUND_Y, z:-size},
        {x: size, y:GROUND_Y, z:-size},
        {x: size, y:GROUND_Y, z: size},
        {x:-size, y:GROUND_Y, z: size}
    ]
    const faces = [
        { indices:[0,1,2], uvs:[{x:0,y:0},{x:1,y:0},{x:1,y:1}] },
        { indices:[0,2,3], uvs:[{x:0,y:0},{x:1,y:1},{x:0,y:1}] }
    ]
    figures.push({
        center:{x:0,y:0,z:0},
        originalCenter:{x:0,y:0,z:0},
        vs,
        faces,
        vel:{x:0,y:0,z:0},
        mass:Infinity,
        radius:0,
        color: "#202020"
    })
}

function align_normal_to_up(f, normal){
    const up = {x:0, y:1, z:0}

    if(!normal) return

    const speed = Math.hypot(f.vel.x, f.vel.y, f.vel.z)
    const weight = Math.min(1, 0.1 + 0.9 * (1 - speed / 0.05))

    const axis = cross(normal, up)
    const len = Math.hypot(axis.x, axis.y, axis.z)
    if(len < 1e-5) return
    axis.x /= len
    axis.y /= len
    axis.z /= len

    const angle = Math.acos(Math.max(-1, Math.min(1, dot(normal, up))))
    const step = Math.min(angle, SNAP_ANGLE) * weight

    f.ang = f.ang || {x:0, y:0, z:0}
    f.ang.x += axis.x * step
    f.ang.y += axis.y * step
    f.ang.z += axis.z * step
}

function physics_step(){
    for(const f of figures){
        if(!isFinite(f.mass)) continue

        f.vel.y += GRAVITY

        f.center.x += f.vel.x
        f.center.y += f.vel.y
        f.center.z += f.vel.z

        const sphereBottomY = f.center.y - f.radius

        if(sphereBottomY < GROUND_Y){
            const penetration = GROUND_Y - sphereBottomY
            f.center.y += penetration

            if(f.vel.y < 0){
                if(Math.abs(f.vel.y) < STOP_EPS) f.vel.y = 0
                else f.vel.y *= -RESTITUTION
            }

            f.vel.x *= FRICTION
            f.vel.z *= FRICTION

            if(f.radius > 0){
                const rollSpeed = 0.8
                f.ang = f.ang || {x:0,y:0,z:0}
                f.ang.x += rollSpeed * f.vel.z / f.radius
                f.ang.z -= rollSpeed * f.vel.x / f.radius
            }

            const slowY = Math.abs(f.vel.y) < SNAP_VEL_Y
            const slowXZ = Math.hypot(f.vel.x, f.vel.z) < SNAP_VEL_XZ

            if(slowY && slowXZ){
                let bestNormal = null
                let bestDot = -Infinity

                for(const face of f.faces){
                    let a = f.vs[face.indices[0]]
                    let b = f.vs[face.indices[1]]
                    let c = f.vs[face.indices[2]]

                    if(f.ang){
                        const rot = v => {
                            v = rotate_xz(v, f.ang.y)
                            v = rotate_yz(v, f.ang.x)
                            const c0 = Math.cos(f.ang.z), s0 = Math.sin(f.ang.z)
                            return {
                                x: v.x*c0 - v.y*s0,
                                y: v.x*s0 + v.y*c0,
                                z: v.z
                            }
                        }
                        a = rot(a)
                        b = rot(b)
                        c = rot(c)
                    }

                    const n = normalize(cross(sub(b,a), sub(c,a)))

                    if(n.y > bestDot){
                        bestDot = n.y
                        bestNormal = n
                    }
                }

                if(Math.hypot(f.vel.x, f.vel.z) < 0.005){
                    f.vel.x = 0
                    f.vel.z = 0
                }

                align_normal_to_up(f, bestNormal)

                f.vel.y = 0
                f.vel.x *= 0.9
                f.vel.z *= 0.9
            }
        }
    }
}

function set_texture(f,src){
    const i=new Image()
    i.src=src
    i.onload=()=>f.texture=i
}

const keys={}
onkeydown=e=>keys[e.key]=true
onkeyup=e=>keys[e.key]=false

let md=false,lx=0,ly=0
game.onmousedown=e=>{md=true;lx=e.clientX;ly=e.clientY}
onmouseup=()=>md=false
onmousemove=e=>{
    if(!md) return
    camera.yaw-=(e.clientX-lx)*0.003
    camera.pitch-=(e.clientY-ly)*0.003
    camera.pitch=Math.max(-1.56,Math.min(1.56,camera.pitch))
    lx=e.clientX;ly=e.clientY
}

function drawLightPoint(){
    if(!drawLighting) return

    const p = to_camera({
        x: lightDir.x * 5,
        y: lightDir.y * 5,
        z: lightDir.z * 5
    })

    if(p.z <= 0) return

    const s = screen(project(p))

    ctx.fillStyle = "#ffff00"
    ctx.beginPath()
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2)
    ctx.fill()
}

function lightDir_camera(){
    let v = rotate_xz(lightDir, -camera.yaw)
    v = rotate_yz(v, -camera.pitch)
    return normalize(v)
}

function frame(){
    clear()
    let mv={x:0,y:0,z:0},s=0.05
    if(keys.w)mv.z+=s;if(keys.s)mv.z-=s
    if(keys.a)mv.x-=s;if(keys.d)mv.x+=s
    if(keys[" "])mv.y+=s;if(keys.Shift)mv.y-=s
    mv=rotate_yz(mv,camera.pitch)
    mv=rotate_xz(mv,camera.yaw)
    camera.pos.x+=mv.x
    camera.pos.y+=mv.y
    camera.pos.z+=mv.z
    
    if(drawPhysics) physics_step()

    const polys=[]
    for(const f of figures){
        const verts = f.vs.map(p=>{
            let v = p

            if(drawPhysics && f.ang){
                v = rotate_xz(v, f.ang.y)
                v = rotate_yz(v, f.ang.x)
                v = {x:v.x, y:v.y, z:v.z}
                const c = Math.cos(f.ang.z), s = Math.sin(f.ang.z)
                v = { x: v.x*c - v.y*s, y: v.x*s + v.y*c, z: v.z }
            }


            return to_camera(translate(translate_z(v,2),f.center))
        })
        for(const face of f.faces){
            const pts = face.indices.map(i => verts[i])

            const e1 = sub(pts[1], pts[0])
            const e2 = sub(pts[2], pts[0])
            let n = normalize(cross(e1, e2))

            const viewDir = normalize({
                x: -pts[0].x,
                y: -pts[0].y,
                z: -pts[0].z
            })

            if(dot(n, viewDir) < 0){
                n = { x:-n.x, y:-n.y, z:-n.z }
            }

            const L = lightDir_camera()
            const light = drawLighting
                ? 0.2 + 0.8 * Math.max(0, dot(n, L))
                : 1

            const clipped = clip_triangle(pts)
            if(!clipped.length) continue

            for(const tri of clipped){
                polys.push({
                    proj: tri.map(p => screen(project(p))),
                    depth: tri.reduce((s,p)=>s+p.z,0)/3,
                    texture: f.texture,
                    uvs: face.uvs,
                    light,
                    color: f.color
                })
            }
        }

    }
    polys.sort((a,b)=>b.depth-a.depth)
    for(const p of polys){
        draw_polygon(p.proj, p.uvs, p.texture, p.light, p.color)
    }
    drawLightPoint()
    requestAnimationFrame(frame)
}

add_cube({x:-0.7,y:0,z:0},0.5)
set_texture(figures.at(-1),"jes.jpg")

add_pyramid({x:0.7,y:0,z:0},0.4,0.5)
set_texture(figures.at(-1),"obama.jpg")

add_sphere({x:0,y:0,z:0},0.3,12,20)
set_texture(figures.at(-1),"saul.jpg")

add_ground()

frame()
