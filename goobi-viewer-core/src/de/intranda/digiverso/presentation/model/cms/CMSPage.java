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
package de.intranda.digiverso.presentation.model.cms;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

import javax.persistence.CascadeType;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;

import org.apache.commons.collections.comparators.NullComparator;
import org.apache.commons.lang3.StringUtils;
import org.eclipse.persistence.annotations.CascadeOnDelete;
import org.eclipse.persistence.annotations.PrivateOwned;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import de.intranda.digiverso.presentation.managedbeans.CmsBean;
import de.intranda.digiverso.presentation.managedbeans.CmsMediaBean;
import de.intranda.digiverso.presentation.managedbeans.utils.BeanUtils;
import de.intranda.digiverso.presentation.model.cms.CMSContentItem.CMSContentItemType;
import de.intranda.digiverso.presentation.model.cms.CMSPageLanguageVersion.CMSPageStatus;
import de.intranda.digiverso.presentation.servlets.rest.cms.CMSContentResource;
import de.unigoettingen.sub.commons.contentlib.exceptions.IllegalRequestException;

@Entity
@Table(name = "cms_pages")
public class CMSPage {

    /** Logger for this class. */
    private static final Logger logger = LoggerFactory.getLogger(CMSPage.class);
    public static final String GLOBAL_LANGUAGE = "global";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cms_page_id")
    private Long id;

    @Column(name = "template_id", nullable = false)
    private String templateId;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "date_created", nullable = false)
    private Date dateCreated;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "date_updated")
    private Date dateUpdated;

    @Column(name = "published", nullable = false)
    private boolean published = false;

    @Column(name = "page_sorting", nullable = true)
    private Long pageSorting = null;

    @Column(name = "use_default_sidebar", nullable = false)
    private boolean useDefaultSidebar = true;

    @OneToMany(mappedBy = "ownerPage", fetch = FetchType.EAGER, cascade = { CascadeType.ALL })
    @PrivateOwned
    private List<CMSPageLanguageVersion> languageVersions = new ArrayList<>();
    
    @Column(name="persistent_url", nullable = true)
    private String persistentUrl;

    @OneToMany(mappedBy = "ownerPage", fetch = FetchType.EAGER, cascade = { CascadeType.ALL })
    @OrderBy("order")
    @PrivateOwned
    @CascadeOnDelete
    private List<CMSSidebarElement> sidebarElements = new ArrayList<>();

    @Transient
    private List<CMSSidebarElement> unusedSidebarElements;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "cms_page_classifications", joinColumns = @JoinColumn(name = "page_id"))
    @Column(name = "classification")
    @PrivateOwned
    private List<String> classifications = new ArrayList<>();

    @Transient
    private String sidebarElementString = null;

    @Transient
    private int listPage = 1;

    @Column(name = "static_page", nullable = true)
    private String staticPageName;

    public boolean saveSidebarElements() {
        logger.trace("selected elements:{}\n", sidebarElementString);
        if (sidebarElementString != null) {
            List<CMSSidebarElement> selectedElements = new ArrayList<>();
            String[] ids = sidebarElementString.split("\\&?item=");
            for (int i = 0; i < ids.length; ++i) {
                if (StringUtils.isBlank(ids[i])) {
                    continue;
                }

                CMSSidebarElement element = getAvailableSidebarElement(ids[i]);
                if (element != null) {
                    // element.setType(ids[i]);
                    element.setValue("bds");
                    element.setOrder(i);
                    //		    element.setId(null);
                    element.setOwnerPage(this);
                    selectedElements.add(element);
                }
            }
            setSidebarElements(selectedElements);
            return true;
        }

        return false;
    }

    public void resetItemData() {
        logger.trace("Resetting item data");
        for (CMSPageLanguageVersion lv : getLanguageVersions()) {
            for (CMSContentItem ci : lv.getContentItems()) {
                ci.resetData();
            }
        }
    }

    /**
     * @param string
     * @return
     */
    private CMSSidebarElement getAvailableSidebarElement(String id) {
        for (CMSSidebarElement visibleElement : getSidebarElements()) {
            if (Integer.toString(visibleElement.getSortingId()).equals(id)) {
                return visibleElement;
            }
        }
        for (CMSSidebarElement unusedElement : getUnusedSidebarElements()) {
            if (Integer.toString(unusedElement.getSortingId()).equals(id)) {
                return unusedElement;
            }
        }
        return null;
    }

    public List<CMSSidebarElement> getUnusedSidebarElements() {
        if (unusedSidebarElements == null) {
            createUnusedSidebarElementList();
        }
        return unusedSidebarElements;
    }

    /**
     *
     */
    private void createUnusedSidebarElementList() {
        unusedSidebarElements = CMSSidebarManager.getAvailableSidebarElements();
        Iterator<CMSSidebarElement> unusedIterator = unusedSidebarElements.iterator();

        while (unusedIterator.hasNext()) {
            CMSSidebarElement unusedElement = unusedIterator.next();
            for (CMSSidebarElement visibleElement : getSidebarElements()) {
                if (visibleElement.equals(unusedElement)) {
                    unusedIterator.remove();
                    break;
                }
            }
        }

    }

    public void addSidebarElement(CMSSidebarElement element) {
        if (element != null) {
            sidebarElements.add(element);
        }
    }

    /**
     * @return the id
     */
    public Long getId() {
        return id;
    }

    /**
     * @param id the id to set
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * @return the templateId
     */
    public String getTemplateId() {
        return templateId;
    }

    /**
     * @param templateId the templateId to set
     */
    public void setTemplateId(String templateId) {
        this.templateId = templateId;
    }

    /**
     * @return the dateCreated
     */
    public Date getDateCreated() {
        return dateCreated;
    }

    /**
     * @param dateCreated the dateCreated to set
     */
    public void setDateCreated(Date dateCreated) {
        this.dateCreated = dateCreated;
    }

    /**
     * @return the dateUpdated
     */
    public Date getDateUpdated() {
        return dateUpdated;
    }

    /**
     * @param dateUpdated the dateUpdated to set
     */
    public void setDateUpdated(Date dateUpdated) {
        this.dateUpdated = dateUpdated;
    }

    /**
     * @return the published
     */
    public boolean isPublished() {
        return published;
    }

    /**
     * @param published the published to set
     */
    public void setPublished(boolean published) {
        this.published = published;
    }

    /**
     * @return the useDefaultSidebar
     */
    public boolean isUseDefaultSidebar() {
        return useDefaultSidebar;
    }

    /**
     * @param useDefaultSidebar the useDefaultSidebar to set
     */
    public void setUseDefaultSidebar(boolean useDefaultSidebar) {
        this.useDefaultSidebar = useDefaultSidebar;
    }

    /**
     * @return the languageVersions
     */
    public List<CMSPageLanguageVersion> getLanguageVersions() {
        return languageVersions;
    }

    /**
     * @param languageVersions the languageVersions to set
     */
    public void setLanguageVersions(List<CMSPageLanguageVersion> languageVersions) {
        this.languageVersions = languageVersions;
    }

    /**
     * @return the sidebarElements
     */
    public List<CMSSidebarElement> getSidebarElements() {
        return sidebarElements;
    }

    /**
     * @param sidebarElements the sidebarElements to set
     */
    public void setSidebarElements(List<CMSSidebarElement> sidebarElements) {
        this.sidebarElements = sidebarElements;
        createUnusedSidebarElementList();

    }

    /**
     * @return the classifications
     */
    public List<String> getClassifications() {
        return classifications;
    }

    /**
     * @param classifications the classifications to set
     */
    public void setClassifications(List<String> classifications) {
        this.classifications = classifications;
    }

    public void addClassification(String classification) {
        if (StringUtils.isNotBlank(classification) && !classifications.contains(classification)) {
            classifications.add(classification);
        }
    }

    public void removeClassification(String classification) {
        classifications.remove(classification);
    }

    /**
     * @return the sidebarElementString
     */
    public String getSidebarElementString() {
        return sidebarElementString;
    }

    /**
     * @param sidebarElementString the sidebarElementString to set
     */
    public void setSidebarElementString(String sidebarElementString) {
        logger.trace("setSidebarElementString: {}", sidebarElementString);
        this.sidebarElementString = sidebarElementString;
    }

    public boolean isLanguageComplete(Locale locale) {
        for (CMSPageLanguageVersion version : getLanguageVersions()) {
            try {
                if (version.getLanguage().equals(locale.getLanguage())) {
                    return version.getStatus().equals(CMSPageStatus.FINISHED);
                }
            } catch (NullPointerException e) {
            }
        }
        return false;
    }

    public CMSContentItem getContentItem(String itemId, String language) {
        CMSPageLanguageVersion version = getBestLanguage(Locale.forLanguageTag(language));
        if (version == null) {
            return null;
        }
        return version.getContentItem(itemId);
    }

    public CMSPageLanguageVersion getCurrentLanguage() {
        CMSPageLanguageVersion version = null;
        String language = CmsBean.getCurrentLocale().getLanguage();
        version = getLanguageVersion(language);
        if (version == null) {
            language = CmsBean.getDefaultLocaleStatic().getLanguage();
            version = getLanguageVersion(language);
        }
        if (version == null) {
            version = new CMSPageLanguageVersion();
        }
        return version;
    }

    public CMSPageLanguageVersion getDefaultLanguage() {
        CMSPageLanguageVersion version = null;
        String language = CmsBean.getDefaultLocaleStatic().getLanguage();
        version = getLanguageVersion(language);
        if (version == null) {
            version = new CMSPageLanguageVersion();
        }
        return version;
    }

    public CMSPageLanguageVersion getLanguageVersion(Locale locale) {
        String language = locale.getLanguage();
        return getLanguageVersion(language);
    }

    public CMSPageLanguageVersion getLanguageVersion(String language) {
        for (CMSPageLanguageVersion version : getLanguageVersions()) {
            if (version.getLanguage().equals(language)) {
                return version;
            }
        }
        try {
            CMSPageLanguageVersion version = getTemplate().createNewLanguageVersion(this, language);
            this.languageVersions.add(version);
            return version;
        } catch (NullPointerException | IllegalStateException e) {
            return null;
        }
    }

    public String getTitle() {
        String title = getBestLanguage().getTitle();
        return title;
    }

    public String getTitle(Locale locale) {
        return getLanguageVersion(locale.getLanguage()).getTitle();
    }

    public String getMenuTitle() {
        String title = getBestLanguage().getMenuTitle();
        return title;
    }

    public String getMenuTitle(Locale locale) {
        return getLanguageVersion(locale.getLanguage()).getMenuTitle();
    }

    public Long getPageSorting() {
        return pageSorting;
    }

    public void setPageSorting(Long pageSorting) {
        this.pageSorting = pageSorting;
    }

    public String getMediaName(String contentId) {
        CMSMediaItemMetadata metadata = getMediaMetadata(contentId);
        return metadata == null ? "" : metadata.getName();
    }

    public String getMediaDescription(String contentId) {
        CMSMediaItemMetadata metadata = getMediaMetadata(contentId);
        return metadata == null ? "" : metadata.getDescription();
    }

    private CMSMediaItemMetadata getMediaMetadata(String itemId) {
        CMSContentItem item = getContentItem(itemId);
        if (item == null) {
            item = getLanguageVersion(CmsBean.getDefaultLocaleStatic().getLanguage()).getContentItem(itemId);
        }
        if (item != null && item.getMediaItem() != null) {
            return item.getMediaItem().getCurrentLanguageMetadata();
        }
        return null;
    }

    public CMSContentItem getContentItem(String itemId) {
        CMSPageLanguageVersion language = getBestLanguage();
        CMSContentItem item = language.getContentItem(itemId);
        if (item == null) {
            CMSPageLanguageVersion languageVersion = getDefaultLanguage();
            item = languageVersion.getContentItem(itemId);
        }
        if (item == null) {
            for (CMSPageLanguageVersion version : getLanguageVersions()) {
                item = version.getContentItem(itemId);
                if (item != null) {
                    return item;
                }
            }
        }
        return item;
    }

    /**
     * @return
     */
    private CMSPageLanguageVersion getBestLanguage() {
        Locale currentLocale = CmsBean.getCurrentLocale();
        return getBestLanguage(currentLocale);
    }

    private CMSPageLanguageVersion getBestLanguage(Locale locale) {
        CMSPageLanguageVersion language = getLanguageVersion(locale);
        if (language != null && language.getStatus().equals(CMSPageStatus.FINISHED)) {
            return language;
        }
        Locale defaultLocale = CmsBean.getDefaultLocaleStatic();
        language = getLanguageVersion(defaultLocale);
        if (language != null && language.getStatus().equals(CMSPageStatus.FINISHED)) {
            return language;
        }
        for (CMSPageLanguageVersion l : getLanguageVersions()) {
            if (l.getLanguage().equals(GLOBAL_LANGUAGE)) {
                continue;
            }
            if (l.getStatus().equals(CMSPageStatus.FINISHED)) {
                return l;
            }
        }
        for (CMSPageLanguageVersion l : getLanguageVersions()) {
            if (l.getLanguage().equals(GLOBAL_LANGUAGE)) {
                continue;
            }
            return l;
        }

        return new CMSPageLanguageVersion();
    }

    public String getUrl() {
        return CMSContentResource.getPageUrl(this);
    }

    public boolean hasContent(String itemId) {
        CMSContentItem item = getContentItem(itemId);
        if (item != null) {
            switch (item.getType()) {
                case TEXT:
                case HTML:
                    return StringUtils.isNotBlank(item.getHtmlFragment());
                case MEDIA:
                    return item.getMediaItem() != null && StringUtils.isNotBlank(item.getMediaItem().getFileName());
                default:
                    return false;
            }
        }
        return false;
    }

    public String getContent(String itemId) {
        return getContent(itemId, null, null);
    }

    public String getContent(String itemId, String width, String height) {
        logger.trace("Getting content " + itemId + " from page " + getId());
        CMSContentItem item = getContentItem(itemId);
        String contentString = "";
        if (item != null) {
            switch (item.getType()) {
                case TEXT:
                    contentString = item.getHtmlFragment();
                    break;
                case HTML:
                    contentString = CMSContentResource.getContentUrl(item);
                    break;
                case MEDIA:
                    contentString = CmsMediaBean.getMediaUrl(item.getMediaItem(), width, height);
                    break;
                default:
                    contentString = "";
            }
        }
        logger.trace("Got content as string: " + contentString);
        return contentString;
    }

    public List<CMSContentItem> getGlobalContentItems() {
        CMSPageLanguageVersion defaultVersion = getLanguageVersion(GLOBAL_LANGUAGE);
        if (defaultVersion != null) {
            List<CMSContentItem> items = defaultVersion.getContentItems();
            return items;
        }
        return null;
    }

    public List<CMSContentItem> getContentItems() {
        CMSPageLanguageVersion defaultVersion = getLanguageVersion(CmsBean.getCurrentLocale().getLanguage());
        if (defaultVersion != null) {
            List<CMSContentItem> items = defaultVersion.getCompleteContentItemList();
            return items;
        }
        return null;
    }

    public List<CMSContentItem> getContentItems(Locale locale) {
        if (locale != null) {
            CMSPageLanguageVersion version = getLanguageVersion(locale.getLanguage());
            if (version != null) {
                List<CMSContentItem> items = version.getCompleteContentItemList();
                return items;
            }
        }
        return null;
    }

    private static CMSPageTemplate getTemplateById(String id) {
        return CMSTemplateManager.getInstance().getTemplate(id);
    }

    public CMSPageTemplate getTemplate() {
        return getTemplateById(getTemplateId());
    }

    /**
     * Gets the pagination number for this page's main list if it contains one
     *
     * @return
     */
    public int getListPage() {
        return listPage;
    }

    /**
     * Sets the pagination number for this page's main list if it contains one
     *
     * @param listPage
     */
    public void setListPage(int listPage) {
        resetItemData();
        this.listPage = listPage;
    }
    
    

    /**
     * @return the persistentUrl
     */
    public String getPersistentUrl() {
        return persistentUrl;
    }

    /**
     * @param persistentUrl the persistentUrl to set
     */
    public void setPersistentUrl(String persistentUrl) {
        persistentUrl = StringUtils.removeStart(persistentUrl, "/");
        persistentUrl = StringUtils.removeEnd(persistentUrl, "/");
        this.persistentUrl = persistentUrl;
    }

    /**
     *
     */
    public void resetEditorItemVisibility() {
        if (getGlobalContentItems() != null) {
            for (CMSContentItem item : getGlobalContentItems()) {
                item.setVisible(false);
            }
        }
    }

    @Deprecated
    public boolean sortGlobalLanguageItems() {
        CMSPageLanguageVersion global = getLanguageVersion(GLOBAL_LANGUAGE);
        boolean dirty = false;
        if (global == null) {
            global = new CMSPageLanguageVersion();
            global.setOwnerPage(this);
            global.setLanguage(GLOBAL_LANGUAGE);
            global.setStatus(CMSPageStatus.WIP);
            getLanguageVersions().add(global);
            for (CMSPageLanguageVersion version : getLanguageVersions()) {
                if (!version.equals(global)) {
                    Iterator<CMSContentItem> iter = version.getContentItems().iterator();
                    while (iter.hasNext()) {
                        CMSContentItem item = iter.next();
                        switch (item.getType()) {
                            case MEDIA:
                            case PAGELIST:
                            case SOLRQUERY:
                                iter.remove();
                                global.addContentItem(item);
                                item.setOwnerPageLanguageVersion(global);
                                dirty = true;
                            case HTML:
                            case TEXT:
                        }
                    }
                }
            }
        }
        return dirty;
    }

    public static class PageComparator implements Comparator<CMSPage> {
        //null values are high
        NullComparator nullComparator = new NullComparator(true);

        @Override
        public int compare(CMSPage page1, CMSPage page2) {
            int value = nullComparator.compare(page1.getPageSorting(), page2.getPageSorting());
            if (value == 0) {
                value = nullComparator.compare(page1.getId(), page2.getId());
            }
            return value;
        }

    }

    /**
     * @return the staticPageName
     */
    public String getStaticPageName() {
        return staticPageName;
    }

    /**
     * @param staticPageName the staticPageName to set
     */
    public void setStaticPageName(String staticPageName) {
        this.staticPageName = staticPageName;
    }

    public String getTileGridUrl(String itemId) throws IllegalRequestException {
        CMSContentItem item = getContentItem(itemId);
        if (item != null && item.getType().equals(CMSContentItemType.TILEGRID)) {
            StringBuilder sb = new StringBuilder(BeanUtils.getServletPathWithHostAsUrlFromJsfContext());
            sb.append("/rest/tilegrid/").append(CmsBean.getCurrentLocale().getLanguage()).append("/").append(item.getNumberOfTiles()).append("/")
                    .append(item.getNumberOfImportantTiles()).append("/").append(item.getAllowedTags()).append("/");
            return sb.toString();
        }
        throw new IllegalRequestException("No tile grid item with id '" + itemId + "' found");
    }

    /**
     * @return
     */
    public String getRelativeUrlPath(boolean pretty) {
        if(pretty && StringUtils.isNotBlank(getPersistentUrl())) {
            return getPersistentUrl() + "/";
        }
        return "cms/" + getId() + "/";
    }

}
