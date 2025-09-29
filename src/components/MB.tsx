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
            zoom: 3
        });

        mapRef.current = map;

        map.on("load", () => {
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
                    "fill-color": "rgba(200,200,200,0.2)"
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
                        "#ccc"
                    ],
                    "fill-opacity": 0.7
                }
            });

            let selectedDistricts: { name: string; code: string }[] = [];

            const colorPalette = [
                "#e6194b", "#3cb44b", "#ffe119", "#4363d8",
                "#f58231", "#911eb4", "#46f0f0", "#f032e6",
                "#bcf60c", "#fabebe", "#008080", "#e6beff"
            ];

            function updateHighlightColors() {
                let matchExpression: mapboxgl.Expression;

                if (selectedDistricts.length > 0) {
                    matchExpression = [
                        "match",
                        ["get", "GID_2"],
                        ...selectedDistricts.flatMap((d, i) => [
                            d.code,
                            colorPalette[i % colorPalette.length]
                        ]),
                        "#ccc"
                    ];
                } else {
                    matchExpression = ["literal", "#ccc"];
                }

                map.setPaintProperty("districts-highlight", "fill-color", matchExpression);
                localStorage.setItem("selectedDistricts", JSON.stringify(selectedDistricts));
                setSelectedCity([...selectedDistricts]);
            }

            const stored = localStorage.getItem("selectedDistricts");
            if (stored) {
                try {
                    selectedDistricts = JSON.parse(stored);
                    updateHighlightColors();
                } catch (e) {
                    console.warn("Failed to parse stored districts:", e);
                }
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
                console.log("Clicked feature:", clicked);
                const name = clicked.properties?.NAME_2;
                const code = clicked.properties?.GID_2;

                const index = selectedDistricts.findIndex((d) => d.code === code);
                if (index > -1) {
                    selectedDistricts.splice(index, 1);
                } else {
                    selectedDistricts.push({ name, code });
                }

                updateHighlightColors();

                console.log("Selected districts:", selectedDistricts);
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

    return (<div style={{ display: 'flex' }}>
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
                <p>No city selected</p>
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
    </div>);
};

export default MapboxCountyExplorer;