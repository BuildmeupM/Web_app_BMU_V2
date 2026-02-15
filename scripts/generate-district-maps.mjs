/**
 * Generate per-province district SVG map data
 * Fetches districts.geojson from GitHub, converts GeoJSON MultiPolygon → SVG paths,
 * then splits into 77 JSON files (one per province) in public/districts/
 *
 * Run:  node scripts/generate-district-maps.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'districts')

const GEOJSON_URL = 'https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/districts.geojson'

// ─── GeoJSON → SVG helpers ─────────────────────────────────

/**
 * Convert a single polygon ring (array of [lng, lat]) to SVG path segment
 * Uses Mercator-like projection: x = lng, y = -lat (flip for SVG)
 */
function ringToPathSegment(ring) {
    return ring.map((coord, i) => {
        const [lng, lat] = coord
        const cmd = i === 0 ? 'M' : 'L'
        return `${cmd}${lng},${-lat}`
    }).join(' ') + ' Z'
}

/**
 * Convert GeoJSON MultiPolygon coordinates to SVG path string
 */
function multiPolygonToPath(coordinates) {
    const segments = []
    for (const polygon of coordinates) {
        for (const ring of polygon) {
            segments.push(ringToPathSegment(ring))
        }
    }
    return segments.join(' ')
}

/**
 * Compute bounding box centroid from coordinate rings
 */
function computeCentroid(coordinates) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const polygon of coordinates) {
        for (const ring of polygon) {
            for (const [lng, lat] of ring) {
                if (lng < minX) minX = lng
                if (lng > maxX) maxX = lng
                if (lat < minY) minY = lat
                if (lat > maxY) maxY = lat
            }
        }
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

/**
 * Compute bounding box for a set of districts
 */
function computeBoundingBox(districts) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const d of districts) {
        for (const polygon of d.coordinates) {
            for (const ring of polygon) {
                for (const [lng, lat] of ring) {
                    if (lng < minX) minX = lng
                    if (lng > maxX) maxX = lng
                    if (lat < minY) minY = lat
                    if (lat > maxY) maxY = lat
                }
            }
        }
    }
    return { minX, maxX, minY, maxY }
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
    console.log('📥 Fetching districts.geojson …')
    const resp = await fetch(GEOJSON_URL)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const geojson = await resp.json()
    console.log(`   Found ${geojson.features.length} features`)

    // Group features by province Thai name
    const byProvince = new Map()
    for (const feature of geojson.features) {
        const { amp_th, pro_th } = feature.properties
        const coords = feature.geometry.coordinates
        if (!byProvince.has(pro_th)) byProvince.set(pro_th, [])
        byProvince.get(pro_th).push({ name: amp_th, coordinates: coords })
    }
    console.log(`   Grouped into ${byProvince.size} provinces`)

    // Ensure output dir
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })

    let totalDistricts = 0

    for (const [province, districts] of byProvince) {
        // Compute bounding box for this province
        const bbox = computeBoundingBox(districts)

        // Add padding (5%)
        const padX = (bbox.maxX - bbox.minX) * 0.05
        const padY = (bbox.maxY - bbox.minY) * 0.05
        const x0 = bbox.minX - padX
        const y0 = bbox.minY - padY
        const w = (bbox.maxX - bbox.minX) + padX * 2
        const h = (bbox.maxY - bbox.minY) + padY * 2

        // Scale to a reasonable SVG size (width = 500, height proportional)
        const svgWidth = 500
        const svgHeight = Math.round((h / w) * svgWidth)
        const scale = svgWidth / w

        // Transform coordinates and build SVG paths
        const districtData = districts.map(d => {
            const centroid = computeCentroid(d.coordinates)

            // Transform coordinates: shift origin, scale, flip Y
            const transformedCoords = d.coordinates.map(polygon =>
                polygon.map(ring =>
                    ring.map(([lng, lat]) => [
                        Math.round(((lng - x0) * scale) * 100) / 100,
                        Math.round(((bbox.maxY + padY - lat) * scale) * 100) / 100,
                    ])
                )
            )

            // Build SVG path from transformed coordinates
            const pathSegments = []
            for (const polygon of transformedCoords) {
                for (const ring of polygon) {
                    pathSegments.push(
                        ring.map((coord, i) => `${i === 0 ? 'M' : 'L'}${coord[0]},${coord[1]}`).join(' ') + ' Z'
                    )
                }
            }

            return {
                name: d.name,
                path: pathSegments.join(' '),
                cx: Math.round(((centroid.cx - x0) * scale) * 100) / 100,
                cy: Math.round(((bbox.maxY + padY - centroid.cy) * scale) * 100) / 100,
            }
        })

        totalDistricts += districtData.length

        const output = {
            province,
            viewBox: `0 0 ${svgWidth} ${svgHeight}`,
            districts: districtData,
        }

        const filename = `${province}.json`
        fs.writeFileSync(
            path.join(OUTPUT_DIR, filename),
            JSON.stringify(output),
            'utf-8'
        )
    }

    console.log(`✅ Generated ${byProvince.size} province files (${totalDistricts} districts total) → ${OUTPUT_DIR}`)
}

main().catch(err => { console.error('❌ Error:', err); process.exit(1) })
