/**
 * This file is part of the Goobi Viewer - a content presentation and management application for digitized objects.
 *
 * Visit these websites for more information.
 *          - http://www.intranda.com
 *          - http://digiverso.com
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
package de.intranda.digiverso.presentation.model.search;

import java.io.Serializable;
import java.util.List;

public class CalendarItemYear implements ICalendarItem, Serializable {

    private static final long serialVersionUID = -3123380483405975449L;

    private String name;
    private int value;
    private int hits;
    private boolean selected = false;
    private List<CalendarItemMonth> monthsOfYear;

    public CalendarItemYear(String name, int value, int hits) {
        this.name = name;
        this.value = value;
        this.hits = hits;

    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public void setName(String name) {
        this.name = name;
    }

    @Override
    public int getHits() {
        return hits;
    }

    @Override
    public void setHits(int hits) {
        this.hits = hits;
    }

    public List<CalendarItemMonth> getMonthsOfYear() {
        return monthsOfYear;
    }

    public void setMonthsOfYear(List<CalendarItemMonth> monthsOfYear) {
        this.monthsOfYear = monthsOfYear;
    }

    @Override
    public boolean isSelected() {
        return selected;
    }

    @Override
    public void setSelected(boolean selected) {
        this.selected = selected;
    }

    @Override
    public int getValue() {
        return value;
    }

    @Override
    public void setValue(int value) {
        this.value = value;
    }

    @Override
    public String toString() {
        return "CalendarItemYear [year=" + name + ", hits=" + hits + "]";
    }
}
