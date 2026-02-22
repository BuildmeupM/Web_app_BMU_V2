/**
 * LocationSelect — Searchable + Creatable dropdown for locations
 */
import { useState, useEffect } from 'react'
import {
    Group, Text, Badge,
    Combobox, useCombobox, InputBase,
} from '@mantine/core'
import { TbMapPin, TbPlus } from 'react-icons/tb'
import type { MessengerLocation } from '../../services/messengerRouteService'

interface LocationSelectProps {
    locations: MessengerLocation[]
    value: string
    onChange: (name: string, loc: MessengerLocation | null) => void
    onCreateNew: (name: string) => void
    label?: string
    placeholder?: string
    size?: string
}

export default function LocationSelect({
    locations,
    value,
    onChange,
    onCreateNew,
    label,
    placeholder,
    size = 'sm',
}: LocationSelectProps) {
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    })

    const [search, setSearch] = useState(value)

    useEffect(() => {
        setSearch(value)
    }, [value])

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(search.toLowerCase().trim())
    )

    const exactMatch = locations.some(loc => loc.name.toLowerCase() === search.toLowerCase().trim())

    const options = filteredLocations.map((loc) => {
        return (
            <Combobox.Option value={loc.id} key={loc.id}>
                <Group gap="xs">
                    <TbMapPin size={14} color="#666" />
                    <div>
                        <Text size="sm" fw={500}>{loc.name}</Text>
                        {loc.address && <Text size="xs" c="dimmed">{loc.address}</Text>}
                    </div>
                    {loc.category && (
                        <Badge size="xs" variant="light" color="gray" ml="auto">{loc.category}</Badge>
                    )}
                    {loc.latitude && loc.longitude && (
                        <Badge size="xs" variant="light" color="green">📍</Badge>
                    )}
                </Group>
            </Combobox.Option>
        )
    })

    return (
        <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
                if (val === '__create__') {
                    onCreateNew(search.trim())
                } else {
                    const loc = locations.find(l => l.id === val)
                    if (loc) {
                        onChange(loc.name, loc)
                        setSearch(loc.name)
                    }
                }
                combobox.closeDropdown()
            }}
        >
            <Combobox.Target>
                <InputBase
                    label={label}
                    placeholder={placeholder}
                    size={size as any}
                    leftSection={<TbMapPin size={14} />}
                    rightSection={<Combobox.Chevron />}
                    rightSectionPointerEvents="none"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.currentTarget.value)
                        onChange(e.currentTarget.value, null)
                        combobox.openDropdown()
                        combobox.updateSelectedOptionIndex()
                    }}
                    onClick={() => combobox.openDropdown()}
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => combobox.closeDropdown()}
                />
            </Combobox.Target>

            <Combobox.Dropdown>
                <Combobox.Options>
                    {options.length > 0 ? options : (
                        <Combobox.Empty>ไม่พบสถานที่</Combobox.Empty>
                    )}
                    {search.trim() && !exactMatch && (
                        <Combobox.Option value="__create__" style={{ borderTop: '1px solid #eee' }}>
                            <Group gap="xs">
                                <TbPlus size={14} color="#228be6" />
                                <Text size="sm" c="blue">เพิ่ม "{search.trim()}" เป็นสถานที่ใหม่</Text>
                            </Group>
                        </Combobox.Option>
                    )}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    )
}
