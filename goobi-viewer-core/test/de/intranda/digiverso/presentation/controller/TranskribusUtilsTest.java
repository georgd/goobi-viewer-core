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
package de.intranda.digiverso.presentation.controller;

import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import de.intranda.digiverso.presentation.controller.Configuration;
import de.intranda.digiverso.presentation.controller.DataManager;
import de.intranda.digiverso.presentation.AbstractDatabaseEnabledTest;

public class TranskribusUtilsTest extends AbstractDatabaseEnabledTest {

    @Before
    public void setUp() throws Exception {
        // Initialize the instance with a custom config file
        DataManager.getInstance().injectConfiguration(new Configuration("resources/test/config_viewer.test.xml"));
    }

    @Test
    public void dummy() throws Exception {
        Assert.assertTrue(true);
    }

    //    /**
    //     * This test will fail if Transkribus is unreachable or any changes to the REST API are made!
    //     * 
    //     * @see TranskribusUtils#auth(String,String)
    //     * @verifies auth correctly
    //     */
    //    @Test
    //    public void auth_shouldAuthCorrectly() throws Exception {
    //        Document doc = TranskribusUtils.auth(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, ConfigurationHelper.getInstance().getTranskribusUserName(),
    //                ConfigurationHelper.getInstance().getTranskribusPassword());
    //        Assert.assertNotNull(doc);
    //        Assert.assertNotNull(doc.getRootElement());
    //        Assert.assertEquals(ConfigurationHelper.getInstance().getTranskribusUserName(), doc.getRootElement().getChildText("userName"));
    //        Assert.assertFalse(StringUtils.isEmpty(doc.getRootElement().getChildText("sessionId")));
    //    }
    //
    //    /**
    //     * @see TranskribusUtils#getCollectionId(String,String)
    //     * @verifies retrieve correct id
    //     */
    //    @Test
    //    public void getCollectionId_shouldRetrieveCorrectId() throws Exception {
    //        TranskribusSession session = TranskribusUtils.login(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, ConfigurationHelper.getInstance()
    //                .getTranskribusUserName(), ConfigurationHelper.getInstance().getTranskribusPassword());
    //        Assert.assertNotNull(session);
    //        Assert.assertEquals("475", TranskribusUtils.getCollectionId(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, session.getSessionId(), "test"));
    //    }
    //
    //    /**
    //     * @see TranskribusUtils#createCollection(String,String)
    //     * @verifies create collection and return numeric id
    //     */
    //    @Test
    //    public void createCollection_shouldCreateCollectionAndReturnNumericId() throws Exception {
    //        TranskribusSession session = TranskribusUtils.login(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, ConfigurationHelper.getInstance()
    //                .getTranskribusUserName(), ConfigurationHelper.getInstance().getTranskribusPassword());
    //        try {
    //            Integer.valueOf(TranskribusUtils.createCollection(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, session.getSessionId(), "test"));
    //        } catch (Exception e) {
    //            e.printStackTrace();
    //            Assert.fail();
    //        }
    //    }
    //
    //    /**
    //     * @see TranskribusUtils#grantCollectionPrivsToViewer(String,String,String)
    //     * @verifies grant privs correctly
    //     */
    //    @Test
    //    public void grantCollectionPrivsToViewer_shouldGrantPrivsCorrectly() throws Exception {
    //        TranskribusSession session = TranskribusUtils.login(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, ConfigurationHelper.getInstance()
    //                .getTranskribusUserName(), ConfigurationHelper.getInstance().getTranskribusPassword());
    //        try {
    //            TranskribusUtils.grantCollectionPrivsToViewer(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, session.getSessionId(), "475", "4847", true);
    //        } catch (Exception e) {
    //            e.printStackTrace();
    //            Assert.fail();
    //        }
    //    }
    //
    //    /**
    //     * @see TranskribusUtils#ingestRecordToCollections(String,TranskribusSession,String,String,String,String)
    //     * @verifies ingest record correctly
    //     */
    //    @Test
    //    public void ingestRecordToCollections_shouldIngestRecordCorrectly() throws Exception {
    //        TranskribusSession session = TranskribusUtils.login(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, ConfigurationHelper.getInstance()
    //                .getTranskribusUserName(), ConfigurationHelper.getInstance().getTranskribusPassword());
    //        try {
    //            TranskribusJob job = TranskribusUtils.ingestRecordToCollections(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, session, "PPN517154005",
    //                    "http://viewer-demo01.intranda.com/viewer/metsresolver?id=PPN517154005", "475", "475");
    //            Assert.assertNotNull(job);
    //            Assert.assertEquals("PPN517154005", job.getPi());
    //            Assert.assertNotNull(job.getJobId());
    //            Assert.assertNotNull(job.getDateCreated());
    //            Assert.assertNotNull(job.getStatus());
    //        } catch (Exception e) {
    //            e.printStackTrace();
    //            Assert.fail();
    //        }
    //    }
    //
    //    /**
    //     * @see TranskribusUtils#checkJobStatus(String,String,TranskribusJob)
    //     * @verifies return correct status
    //     */
    //    @Test
    //    public void checkJobStatus_shouldReturnCorrectStatus() throws Exception {
    //        TranskribusSession session = TranskribusUtils.login(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, ConfigurationHelper.getInstance()
    //                .getTranskribusUserName(), ConfigurationHelper.getInstance().getTranskribusPassword());
    //        try {
    //            Assert.assertEquals(JobStatus.ERROR, TranskribusUtils.checkJobStatus(TranskribusUtils.TRANSRIBUS_REST_TESTING_URL, session.getSessionId(),
    //                    "1810"));
    //        } catch (Exception e) {
    //            e.printStackTrace();
    //            Assert.fail();
    //        }
    //    }

}
