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

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.junit.Assert;
import org.junit.Test;

import de.intranda.digiverso.presentation.AbstractSolrEnabledTest;
import de.intranda.digiverso.presentation.controller.SolrConstants;
import de.intranda.digiverso.presentation.model.metadata.Metadata;
import de.intranda.digiverso.presentation.model.viewer.StructElement;

public class BrowseElementTest extends AbstractSolrEnabledTest {

    /**
     * @see BrowseElement#getFirstVolumeThumbnailPath(String)
     * @verifies build url part correctly
     */
    @Test
    public void getFirstVolumeThumbnailPath_shouldBuildUrlPartCorrectly() throws Exception {
        String anchorPi = "ZDB026544598";
        Assert.assertEquals("ZDB026544598_0001/00000001.tif", BrowseElement.getFirstVolumeThumbnailPath(anchorPi));
    }

    /**
     * @see BrowseElement#addAdditionalMetadataContainingSearchTerms(StructElement,Map,Locale)
     * @verifies add metadata fields that match search terms
     */
    @Test
    public void addAdditionalMetadataContainingSearchTerms_shouldAddMetadataFieldsThatMatchSearchTerms() throws Exception {
        BrowseElement be = new BrowseElement("label", null);

        StructElement se = new StructElement();
        se.getMetadataFields().put("MD_TITLE", Collections.singletonList("FROM FOO TO BAR"));
        se.getMetadataFields().put("MD_YEARPUBLISH", Collections.singletonList("ca. 1984"));
        Assert.assertEquals(2, se.getMetadataFields().size());

        Map<String, Set<String>> searchTerms = new HashMap<>();
        searchTerms.put(SolrConstants.DEFAULT, new HashSet<>(Arrays.asList(new String[] { "foo", "bar" })));
        searchTerms.put("MD_YEARPUBLISH", new HashSet<>(Arrays.asList(new String[] { "1984" })));

        be.addAdditionalMetadataContainingSearchTerms(se, searchTerms);

        {
            String field = "MD_TITLE";
            Assert.assertNotNull(be.getMetadataList(field));
            List<Metadata> mdList = be.getMetadataList(field);
            Assert.assertFalse(mdList.get(0).getValues().isEmpty());
            Assert.assertEquals("FROM <span class=\"search-list--highlight\">FOO</span> TO <span class=\"search-list--highlight\">BAR</span>", mdList
                    .get(0).getValues().get(0).getComboValueShort(0));
        }
        {
            String field = "MD_YEARPUBLISH";
            Assert.assertNotNull(be.getMetadataList(field));
            List<Metadata> mdList = be.getMetadataList(field);
            Assert.assertFalse(mdList.get(0).getValues().isEmpty());
            Assert.assertEquals("ca. <span class=\"search-list--highlight\">1984</span>", mdList.get(0).getValues().get(0).getComboValueShort(0));
        }
    }

    /**
     * @see BrowseElement#addAdditionalMetadataContainingSearchTerms(StructElement,Map)
     * @verifies not add duplicates from default terms
     */
    @Test
    public void addAdditionalMetadataContainingSearchTerms_shouldNotAddDuplicatesFromDefaultTerms() throws Exception {
        BrowseElement be = new BrowseElement("FROM FOO TO BAR", null);

        StructElement se = new StructElement();
        se.getMetadataFields().put("MD_TITLE", Collections.singletonList("FROM FOO TO BAR")); // same value as the main label
        Assert.assertEquals(1, se.getMetadataFields().size());

        Map<String, Set<String>> searchTerms = new HashMap<>();
        searchTerms.put(SolrConstants.DEFAULT, new HashSet<>(Arrays.asList(new String[] { "foo", "bar" })));

        be.addAdditionalMetadataContainingSearchTerms(se, searchTerms);
        Assert.assertTrue(be.getMetadataList("MD_TITLE").isEmpty());
    }

}