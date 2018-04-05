/**
 * This file is part of the Goobi viewer - a content presentation and management application for digitized objects.
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
package de.intranda.digiverso.presentation.model.cms;

import java.util.Locale;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

public class CMSStaticPageTest {

    private CMSStaticPage page = new CMSStaticPage("test");

    @Before
    public void setUp() {

    }

    @Test
    public void testGetPageName() {
        Assert.assertEquals("test", page.getPageName());
    }

    @Test
    public void testIsLanguageComplete() {
        Assert.assertFalse(page.isLanguageComplete(Locale.GERMANY));
    }

    @Test
    public void testHasCmsPage() {
        Assert.assertFalse(page.isHasCmsPage());
    }

}
