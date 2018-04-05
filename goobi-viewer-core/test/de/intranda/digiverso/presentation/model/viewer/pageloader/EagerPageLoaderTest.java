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
package de.intranda.digiverso.presentation.model.viewer.pageloader;

import org.junit.Assert;
import org.junit.Test;

import de.intranda.digiverso.presentation.AbstractDatabaseAndSolrEnabledTest;
import de.intranda.digiverso.presentation.model.viewer.PhysicalElement;
import de.intranda.digiverso.presentation.model.viewer.StructElement;

public class EagerPageLoaderTest extends AbstractDatabaseAndSolrEnabledTest {

    /**
     * @see EagerPageLoader#getNumPages()
     * @verifies return size correctly
     */
    @Test
    public void getNumPages_shouldReturnSizeCorrectly() throws Exception {
        StructElement se = new StructElement(1387459019047L);
        Assert.assertNotNull(se);
        EagerPageLoader pageLoader = new EagerPageLoader(se);
        Assert.assertEquals(16, pageLoader.getNumPages());
    }

    /**
     * @see EagerPageLoader#getPage(int)
     * @verifies return correct page
     */
    @Test
    public void getPage_shouldReturnCorrectPage() throws Exception {
        StructElement se = new StructElement(1387459019047L);
        Assert.assertNotNull(se);
        EagerPageLoader pageLoader = new EagerPageLoader(se);
        PhysicalElement pe = pageLoader.getPage(3);
        Assert.assertNotNull(pe);
        Assert.assertEquals(3, pe.getOrder());
    }

    /**
     * @see EagerPageLoader#getPageForFileName(String)
     * @verifies return the correct page
     */
    @Test
    public void getPageForFileName_shouldReturnTheCorrectPage() throws Exception {
        StructElement se = new StructElement(1387459019047L);
        Assert.assertNotNull(se);
        EagerPageLoader pageLoader = new EagerPageLoader(se);
        PhysicalElement pe = pageLoader.getPageForFileName("00000004.tif");
        Assert.assertNotNull(pe);
        Assert.assertEquals(3, pe.getOrder());
    }

    /**
     * @see EagerPageLoader#getPageForFileName(String)
     * @verifies return null if file name not found
     */
    @Test
    public void getPageForFileName_shouldReturnNullIfFileNameNotFound() throws Exception {
        StructElement se = new StructElement(1387459019047L);
        Assert.assertNotNull(se);
        EagerPageLoader pageLoader = new EagerPageLoader(se);
        PhysicalElement pe = pageLoader.getPageForFileName("NOTFOUND.tif");
        Assert.assertNull(pe);
    }

    /**
     * @see EagerPageLoader#setFirstAndLastPageOrder()
     * @verifies set first page order correctly
     */
    @Test
    public void setFirstAndLastPageOrder_shouldSetFirstPageOrderCorrectly() throws Exception {
        StructElement se = new StructElement(1387459019047L);
        Assert.assertNotNull(se);
        EagerPageLoader pageLoader = new EagerPageLoader(se);
        Assert.assertEquals(0, pageLoader.getFirstPageOrder());
    }

    /**
     * @see EagerPageLoader#setFirstAndLastPageOrder()
     * @verifies set last page order correctly
     */
    @Test
    public void setFirstAndLastPageOrder_shouldSetLastPageOrderCorrectly() throws Exception {
        StructElement se = new StructElement(1387459019047L);
        Assert.assertNotNull(se);
        EagerPageLoader pageLoader = new EagerPageLoader(se);
        Assert.assertEquals(15, pageLoader.getLastPageOrder());
    }
}