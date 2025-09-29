import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapboxCountyExplorer: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [selectedCity, setSelectedCity] = useState<{ name: string; code: string }[]>([]);

    useEffect(() => {
        mapboxgl.accessToken = 'pk.eyJ1IjoiamJnYXVyYXYiLCJhIjoiY21mbTNubWd5MDNtMDJsc2RqaW00dGhzeCJ9.O3WAsIbIi5bwvgOEA8QvvQ';

        const map = new mapboxgl.Map({
            container: mapContainerRef.current!,
            style: 'mapbox://styles/mapbox/standard',
            center: [78.9629, 20.5937],
            minZoom: 2,
            zoom: 5,
            maxBounds: [
                [72, 7],
                [92, 34]
            ]
        });

        mapRef.current = map;

        map.on("load", () => {
            map.panBy([-200, -50]);
            map.addSource("districts", {
                type: "vector",
                url: "mapbox://jbgaurav.bxvnqx9z"
            });

            map.addLayer({
                id: "districts-fill",
                type: "fill",
                source: "districts",
                "source-layer": "gadm41_IND_2-8mycln",
                paint: {
                    "fill-outline-color": "rgba(0,0,0,0.3)",
                    "fill-color": "rgba(200,200,200,0.2)",
                    "fill-opacity": 0.5
                }
            });

            map.addLayer({
                id: "districts-highlight",
                type: "fill",
                source: "districts",
                "source-layer": "gadm41_IND_2-8mycln",
                paint: {
                    "fill-outline-color": "#000",
                    "fill-color": [
                        "match",
                        ["get", "GID_2"],
                        "", "#6e599f",
                        "rgba(0,0,0,0)"
                    ],
                    "fill-opacity": 0.8
                }
            });

            // Restore saved districts from localStorage
            let selectedDistricts: { name: string; code: string }[] =
                JSON.parse(localStorage.getItem("selectedDistricts") || "[]");

            const dullColorPalette = [
                "#D3B5B5", "#B5D3B5", "#D3D3B5", "#B5B5D3", "#D3C5B5", "#C5B5D3",
                "#B5D3C5", "#D3D3C5", "#C5B5C5", "#B5C5D3", "#D3B5C5", "#B5D3D3",
                "#C5C5B5", "#B5C5C5", "#C5B5B5", "#B5D3B5", "#D3B5B5", "#C5D3B5",
                "#B5C5D3", "#C5C5D3", "#D3C5C5", "#C5D3C5", "#B5B5C5", "#D3D3B5",
                "#C5B5D3", "#B5C5B5", "#D3C5B5", "#B5D3C5", "#C5C5C5", "#D3B5D3",
                "#B5D3B5", "#C5B5C5", "#D3C5C5", "#B5C5D3", "#C5D3D3", "#D3D3D3"
            ];

            const brightColorPalette = [
                "#FF6B6B", "#4ECDC4", "#FFE66D", "#6B73FF", "#FF8C42", "#B83DBA",
                "#4ECDC4", "#F7DC6F", "#BB8FCE", "#85C1E9", "#F8C471", "#82E0AA",
                "#F1948A", "#85929E", "#A569BD", "#5DADE2", "#58D68D", "#F4D03F",
                "#EC7063", "#AF7AC5", "#AED6F1", "#F8BBD0", "#C8E6C9", "#FFF9C4",
                "#FFCDD2", "#E1BEE7", "#B39DDB", "#90CAF9", "#81C784", "#FFB74D",
                "#FFAB91", "#BCAAA4", "#EEEEEE", "#B0BEC5", "#D7CCC8", "#F8BBD0"
            ];

            function simpleHash(str: string): number {
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return Math.abs(hash);
            }

            // Apply dull colors when source is loaded
            map.on('sourcedata', (e) => {
                if (e.sourceId === 'districts' && e.isSourceLoaded) {
                    const features = map.querySourceFeatures('districts', {
                        sourceLayer: 'gadm41_IND_2-8mycln'
                    });

                    if (features.length > 0) {
                        const matchExpression: mapboxgl.ExpressionSpecification = [
                            "match",
                            ["get", "GID_2"],
                            ...features.reduce<string[]>((acc, feature) => {
                                const gid = feature.properties?.GID_2;
                                if (gid && !acc.includes(gid)) {
                                    const colorIndex = simpleHash(gid) % dullColorPalette.length;
                                    acc.push(gid, dullColorPalette[colorIndex]);
                                }
                                return acc;
                            }, []),
                            "rgba(200,200,200,0.2)"
                        ];
                        map.setPaintProperty("districts-fill", "fill-color", matchExpression);
                        updateHighlightColors(); // restore highlights
                    }
                }
            });

            function updateHighlightColors() {
                let matchExpression: mapboxgl.Expression;

                if (selectedDistricts.length > 0) {
                    matchExpression = [
                        "match",
                        ["get", "GID_2"],
                        ...selectedDistricts.flatMap((d) => {
                            const colorIndex = simpleHash(d.code) % brightColorPalette.length;
                            return [d.code, brightColorPalette[colorIndex]];
                        }),
                        "rgba(0,0,0,0)"
                    ];
                } else {
                    matchExpression = ["literal", "rgba(0,0,0,0)"];
                }

                map.setPaintProperty("districts-highlight", "fill-color", matchExpression);

                // Save to state + localStorage
                setSelectedCity([...selectedDistricts]);
                localStorage.setItem("selectedDistricts", JSON.stringify(selectedDistricts));
            }

            map.on("click", (e) => {
                const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
                    [e.point.x - 5, e.point.y - 5],
                    [e.point.x + 5, e.point.y + 5]
                ];

                const features = map.queryRenderedFeatures(bbox, {
                    layers: ["districts-fill"]
                });

                if (!features.length) return;

                const clicked = features[0];
                const name = clicked.properties?.NAME_2;
                const code = clicked.properties?.GID_2;

                const index = selectedDistricts.findIndex((d) => d.code === code);
                if (index > -1) {
                    selectedDistricts.splice(index, 1);
                } else {
                    selectedDistricts.push({ name, code });
                }

                updateHighlightColors();
            });

            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false
            });

            map.on("mousemove", "districts-fill", (e) => {
                if (!e.features?.length) return;
                const props = e.features[0].properties;
                const name = props?.NAME_2;
                const state = props?.NAME_1;
                const code = props?.HASC_2;

                popup
                    .setLngLat(e.lngLat)
                    .setHTML(
                        `<strong>${name}</strong><br/>
                         State: ${state}<br/>
                         Code: ${code}`
                    )
                    .addTo(map);
            });

            map.on("mouseleave", "districts-fill", () => {
                popup.remove();
            });
        });

        return () => {
            map.remove();
        };
    }, []);

    return (
        <div style={{ display: 'flex' }}>
            <div
                ref={mapContainerRef}
                style={{ width: '75%', height: '100vh' }}
            />
            <div
                style={{
                    width: '25%',
                    height: '100vh',
                    overflowY: 'auto',
                    padding: '10px',
                    borderLeft: '1px solid #ccc',
                }}
            >
                <h3>Selected Cities</h3>
                {selectedCity.length === 0 ? (
                    <p>Click on districts to select them</p>
                ) : (
                    <ul>
                        {selectedCity.map((d) => (
                            <li key={d.code}>
                                {d.name} ({d.code})
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MapboxCountyExplorer;
